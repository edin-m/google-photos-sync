const fs = require('fs');
const path = require('path');
const lo = require('lodash');

const moment = require('moment');

const config = require('./config.json');

const util = require('./util');
const { log } = require('./log');

const __referenceStoredItem = {
    mediaItem: {},
    appData: {
        mediaItemGet: {
            at: Date.now()
        },
        probe: {
            at: Date.now(),
            contentLength: 123
        },
        download: {
            at: Date.now(),
            contentLength: 123
        }
    }
};

/**
MediaItem is a Google Photos API data structure containing item metadata.
StoredItem is MediaItem + app metadata { mediaItem, appData }
*/

class AppController {

    constructor(photoDb, albumDb, googlePhotos, downloadPath) {
        this.photoDb = photoDb;
        this.albumDb = albumDb;
        this.googlePhotos = googlePhotos;
        this.downloadPath = downloadPath;
    }

    onAlbums(albums) {
        log.info(this, 'onAlbums');

        const maxTitleStringLen = albums.reduce((prev, curr) => Math.max(prev, curr.title.length), 0);

        albums.forEach(album => {
            album.items = [];
            this.albumDb.set(album.id, album);

            log.info(this, album.title.padEnd(maxTitleStringLen), album.id)
        });
    }

    onRefreshAlbum(album, items) {
        log.info(this, 'onRefreshAlbum');

        album.items = items;
        let albums = [album];
        this.onAlbums(albums);
    }

    onMediaItemsDownloaded(mediaItems) {
        log.info(this, 'onMediaItemsDownloaded', mediaItems.length);

        const storedItems = mediaItems.map(mediaItem => {
            let storedItem = this.photoDb.get(mediaItem.id);

            if (storedItem == null) {
                storedItem = { mediaItem, appData: {} };
            } else {
                storedItem.mediaItem = mediaItem;
            }

            return this.photoDb.set(mediaItem.id, storedItem);
        });

        log.info(this, 'onMediaItemsDownloaded total media items', this.photoDb.getAll().length);
        this._fixFilenamesForDuplicates();
        return storedItems;
    }

    _fixFilenamesForDuplicates() {
        const duplicates = this._getStoredItemsWithDuplicateFilenames();

        log.info(this, 'fixFilenamesForDuplicates found duplicates', Object.keys(duplicates).length);

        for (let filename in duplicates) {
            duplicates[filename].storedItems.forEach((storedItem, idx) => {
                storedItem.altFilename = `${idx}_${filename}`;

                this.photoDb.set(storedItem.mediaItem.id, storedItem);
            });
        }
    }

    _getStoredItemsWithDuplicateFilenames() {
        const counts = {
            // 'filename': { count: 0, ids: [] }
        };

        this._getAllMediaItems()
            .filter(storedItem => !storedItem.altFilename)
            .map(storedItem => {
                const lowercaseFilename = storedItem.mediaItem.filename.toLowerCase();
                const count = counts[lowercaseFilename] || { count: 0, storedItems: [] };
                count.count++;
                count.storedItems.push(storedItem);

                counts[lowercaseFilename] = count;
            });

        const duplicates = {};
        Object.keys(counts)
            .filter(filename => counts[filename].count > 1)
            .forEach(filename => duplicates[filename] = counts[filename]);

        return duplicates;
    }

    _getAllMediaItems() {
        return this.photoDb.getByFilter(value => value.mediaItem);
    }

    findMediaItemIdsToProbe(renewIfOlderThanDays, numberOfItems) {
        log.verbose(this, 'findMediaItemIdsToProbe', renewIfOlderThanDays, numberOfItems);

        const storedItemsToProbe = this.photoDb.getByFilter(
            this._createProbeFilterFn(renewIfOlderThanDays)
        ).slice(0, numberOfItems);

        log.verbose(this, 'storedItemsToProbe', storedItemsToProbe.length);

        return storedItemsToProbe.map(item => item.mediaItem.id);
    }

    _createProbeFilterFn(renewIfOlderThanDays) {
        return value => {
            let probeDataIsOld = true;

            if (value.appData.probe) {
                const diff = util.diffBetweenTwoDates(value.appData.probe.at, Date.now(), 'days');
                probeDataIsOld = diff >= renewIfOlderThanDays;
            }

            return probeDataIsOld;
        };
    }

    onProbedMediaItems(contentLengthMap) {
        log.info(this, 'onProbedMediaItems', Object.keys(contentLengthMap).length);

        const keys = Object.keys(contentLengthMap);
        const storedItems = keys.map(key => {
            const storedItem = this.photoDb.get(key);

            const probeData = storedItem.appData.probe || { at: 0, contentLength: 0 };
            probeData.at = Date.now();
            probeData.contentLength = Number(contentLengthMap[key]);
            storedItem.appData.probe = probeData;

            this.photoDb.set(storedItem.mediaItem.id, storedItem);
            return storedItem;
        });

        const forDownload = this._chooseFilesForDownload(storedItems, contentLengthMap);
        log.verbose(this, 'onProbedMediaItems for download', forDownload.length);

        // resets download metadata of updated items so they can be redownloaded
        forDownload
            .map(storedItem => {
                storedItem.appData.download = null;
                return storedItem;
            })
            .map(storedItem => this.photoDb.set(storedItem.mediaItem.id, storedItem));
    }

    _chooseFilesForDownload(storedItems) {
        return storedItems.filter(storedItem => {
            if (storedItem.appData.probe && storedItem.appData.download) {
                const pcl = storedItem.appData.probe.contentLength;
                const dcl = storedItem.appData.download.contentLength;

                return pcl !== dcl;
            }

            return false;
        });
    }

    async renewMediaItems(mediaItemIds) {
        log.info(this, 'renewMediaItems', mediaItemIds.length);
        const mediaItems = await this.googlePhotos.batchGet(mediaItemIds);
        return this.onMediaItemsDownloaded(mediaItems);
    }

    findMediaItemsToDownload(numberOfItems) {
        log.verbose(this, 'findMediaItemsToDownload', numberOfItems);

        const storedItemsToDownload = this.photoDb.getByFilter(
            this._createDownloadFilterFn(), numberOfItems
        ).slice(0, numberOfItems);

        log.verbose(this, 'findMediaItemsToDownload stored items', storedItemsToDownload.length);

        return storedItemsToDownload.map(storedItem => storedItem.mediaItem.id);
    }

    _createDownloadFilterFn() {
        return value => {
            let isFileExists = false;
            let isFileSizeSame = false;

            if (value.mediaItem) {
                const filename = this._getStoredItemFilename(value);
                const filepath = path.join(this.downloadPath, filename);
                isFileExists = fs.existsSync(filepath);

                if (isFileExists) {
                    const contentLength = lo.get(value.appData, 'download.contentLength');
                    const stat = fs.statSync(filepath);
                    isFileSizeSame = stat.size === contentLength;
                }
            }

            return !(isFileExists && isFileSizeSame);
        };
    }

    getStoredItemsByFilenameMap(filenamesOnDisk) {
        const filenamesSet = new Set(filenamesOnDisk);

        const map = {};

        this.photoDb.getAll().forEach(storedItem => {
            const filename = this._getStoredItemFilename(storedItem);

            if (filenamesSet.has(filename)) {
                map[filename] = {
                    filename,
                    storedItem
                };
            }
        });

        return map;
    }

    _getStoredItemFilename(storedItem) {
        return storedItem.altFilename || storedItem.mediaItem.filename;
    }

    onFilesDownloaded(files) {
        // file = { where: String, mediaItem }

        return files.map(({ valid, where, mediaItem }) => {
            if (!valid) {
                return;
            }

            const stat = fs.statSync(where);
            const download = {
                at: Date.now(),
                contentLength: stat.size
            };

            const date = moment(mediaItem.mediaMetadata.creationTime).toDate();
            fs.utimesSync(where, date, date);

            const storedItem = this.photoDb.get(mediaItem.id);
            storedItem.appData.download = download;
            return this.photoDb.set(mediaItem.id, storedItem);
        });
    }

    hasStoredItemDiscrepancy(storedItem) {
        if (storedItem.appData.probe && storedItem.appData.download) {
            const pcl = storedItem.appData.probe.contentLength;
            const dcl = storedItem.appData.download.contentLength;

            return pcl !== dcl;
        }

        return true;
    }
}

module.exports = AppController;

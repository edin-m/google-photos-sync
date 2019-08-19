const fs = require('fs');
const path = require('path');
const lo = require('lodash');

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

class AppController {
    constructor(storage, googlePhotos, downloadPath) {
        this.storage = storage;
        this.googlePhotos = googlePhotos;
        this.downloadPath = downloadPath;
    }

    onMediaItemsDownloaded(mediaItems) {
        log.info(this, 'onMediaItemsDownloaded', mediaItems.length);

        mediaItems.forEach(mediaItem => {
            const stored = this.storage.get(mediaItem.id);
            const appData = this._createAppData(stored);
            this.googlePhotos.storeMediaItem(mediaItem, appData);
        });

        log.info(this, 'onMediaItemsDownloaded total media items', this.storage.getByFilter(item => item.mediaItem).length);
    }

    _createAppData(stored) {
        let appData;

        if (stored && stored.appData) {
            appData = stored.appData;
        } else {
            appData = { mediaItemGet: { at: 0 }};
        }

        appData.mediaItemGet.at = Date.now();
        return appData;
    }

    findMediaItemIdsToProbe(renewIfOlderThanDays, numberOfItems) {
        log.verbose(this, 'findMediaItemIdsToProbe', renewIfOlderThanDays, numberOfItems);

        const storedItemsToProbe = this.storage.getByFilter(
            this._createProbeFilterFn(renewIfOlderThanDays)
        ).slice(0, numberOfItems);

        log.verbose(this, 'storedItemsToProbe', storedItemsToProbe.length);

        return storedItemsToProbe
            .filter(item => item.mediaItem)
            .map(item => item.mediaItem.id);
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
            const storedItem = this.storage.get(key);
            return this._setupProbeAppData(storedItem, contentLengthMap[key]);
        });

        const forDownload = this._chooseFilesForDownload(storedItems, contentLengthMap);
        log.verbose(this, 'onProbedMediaItems for download', forDownload.length);

        forDownload.forEach(storedItem => storedItem.appData.download = null);
        storedItems.forEach(storedItem => this.storage.set(storedItem.mediaItem.id, storedItem));
    }

    _setupProbeAppData(storedItem, contentLength) {
        if (!storedItem.appData.probe) {
            storedItem.appData.probe = { at: 0, contentLength: 0 };
        }

        storedItem.appData.probe.at = Date.now();
        storedItem.appData.probe.contentLength = Number(contentLength);

        return storedItem;
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

    findMediaItemsToDownload(numberOfItems) {
        log.verbose(this, 'findMediaItemsToDownload', numberOfItems);

        const storedItemsToDownload = this.storage.getByFilter(
            this._createDownloadFilterFn(), numberOfItems
        ).slice(0, numberOfItems);

        log.verbose(this, 'findMediaItemsToDownload stored items', storedItemsToDownload.length);

        return storedItemsToDownload
            .filter(storedItem => storedItem.mediaItem)
            .map(storedItem => storedItem.mediaItem.id);
    }

    _createDownloadFilterFn() {
        return value => {
            let isContentLengthSame = false;
            let isFileExists = false;
            let isFileSizeSame = false;

            if (value.mediaItem) {
                if (value.appData.download && value.appData.probe) {
                    isContentLengthSame = value.appData.probe.contentLength === value.appData.download.contentLength;
                }

                const filename = value.altFilename || value.mediaItem.filename;
                const filepath = path.join(this.downloadPath, filename);
                isFileExists = fs.existsSync(filepath);

                if (isFileExists) {
                    const contentLength = lo.get(value.appData, 'probe.contentLength') || lo.get(value.appData, 'donwload.contentLength');
                    isFileSizeSame = fs.statSync(filepath).size === contentLength;
                }
            }

            return !(isContentLengthSame && isFileExists && isFileSizeSame);
        };
    }

    fixFilenamesForDuplicates() {
        const duplicates = this._getStoredItemsWithDuplicateFilenames();

        log.info(this, 'fixFilenamesForDuplicates found duplicates', Object.keys(duplicates).length);

        for (let filename in duplicates) {
            duplicates[filename].storedItems.forEach((storedItem, idx) => {
                storedItem.altFilename = `${idx}_${filename}`;

                this.storage.set(storedItem.mediaItem.id, storedItem);
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
                const count = counts[storedItem.mediaItem.filename] || { count: 0, storedItems: [] };
                count.count++;
                count.storedItems.push(storedItem);

                counts[storedItem.mediaItem.filename] = count;
            });

        const duplicates = {};
        Object.keys(counts)
            .filter(filename => counts[filename].count > 1)
            .forEach(filename => duplicates[filename] = counts[filename]);

        return duplicates;
    }

    _getAllMediaItems() {
        return this.storage.getByFilter(value => value.mediaItem);
    }
}

module.exports = AppController;

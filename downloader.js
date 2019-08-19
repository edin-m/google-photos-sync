const fs = require('fs');
const path = require('path');
const moment = require('moment');

const mkdirp = require('mkdirp');

const { log } = require('./log');
const util = require('./util');

const config = require('./config.json');

class Downloader {
    constructor(storage, googlePhotos, downloadPath) {
        this.storage = storage;
        this.googlePhotos = googlePhotos;

        this.downloadPath = downloadPath;
        mkdirp(downloadPath);
        this.pageSize = 100;

        this.downloaderState = this.storage.get('class.Downloader.state');

        if (!this.downloaderState) {
            this.downloaderState = {};
        }
    }

    async downloadMediaItems(hintItemsToDownload) {
        log.verbose(this, 'downloadMediaItems hint items', hintItemsToDownload);
        let nextPageToken = null;

        const mediaItems = [];

        while (mediaItems.length < hintItemsToDownload) {
            const numOfItems = Math.min(hintItemsToDownload, this.pageSize);
            let mediaItemsResponse = await this.googlePhotos.listMediaItems(numOfItems, nextPageToken);

            const mediaItemsInResponse = mediaItemsResponse.mediaItems || [];
            if (mediaItemsInResponse.length === 0 && mediaItemsResponse.nextPageToken) {
                console.error('No mediaItems found in response. Continuing to next page.');
            }

            log.info(this, 'downloadMediaItems fetched items', mediaItemsInResponse.length);

            mediaItemsInResponse.forEach(mediaItem => {
                mediaItems.push(mediaItem);
            });

            nextPageToken = mediaItemsResponse.nextPageToken;
        }

        return mediaItems;
    }

    async downloadMediaItemFiles(mediaItemIds) {
        log.verbose(this, 'downloadMediaItemFiles', mediaItemIds.length);
        const mediaItems = await this.googlePhotos.batchGet(mediaItemIds);

        const groups = util.createGroups(mediaItems, config.downloader.maxDownloadFilesAtOnce);
        log.verbose(this, 'downloadMediaItemFiles created groups', groups.length, mediaItems.length);

        for (let group of groups) {
            await Promise.all(this._downloadMediaItemFiles(group));
        }
    }

    _downloadMediaItemFiles(mediaItems) {
        return mediaItems.map(async (mediaItem) => {
            const where = path.join(this.downloadPath, mediaItem.filename);
            const stream = await this.googlePhotos.createDownloadStream(mediaItem);

            return new Promise((resolve, reject) => {
                this.googlePhotos.createDownloadStream(mediaItem);
                stream.pipe(fs.createWriteStream(where)
                    .on('close', () => {
                        resolve();

                        const stat = fs.statSync(where);
                        const download = {at: Date.now(), contentLength: stat.size};

                        const storedItem = this.storage.get(mediaItem.id);
                        storedItem.appData.download = download;
                        this.storage.set(mediaItem.id, storedItem);

                        const date = moment(mediaItem.mediaMetadata.creationTime).toDate();
                        fs.utimesSync(where, date, date);
                    }))
                    .on('error', (err) => {
                        log.error(this, 'error downloading a file', err);
                        resolve();
                    });
            });
        });
    }

    async probeMediaItems(mediaItemIds) {
        const mediaItems = await this.googlePhotos.batchGet(mediaItemIds);

        const contentLengthMap = {};

        await Promise.all(mediaItems.map(async (mediaItem) => {
            const { statusCode, headers } = await this.googlePhotos.probeUrlForContentLength(mediaItem);

            if (statusCode >= 200 && statusCode < 300) {
                contentLengthMap[mediaItem.id] = headers['content-length'];
            } else {
                log.error(this, `${mediaItem.id} status code is ${statusCode}`);
            }
        }));

        return contentLengthMap;
    }
}

module.exports = {
    Downloader
};

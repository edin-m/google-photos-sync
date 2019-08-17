const fs = require('fs');
const path = require('path');

const mkdirp = require('mkdirp');

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
        let nextPageToken = null;

        const mediaItems = [];

        while (mediaItems.length < hintItemsToDownload) {
            const numOfItems = Math.min(hintItemsToDownload, this.pageSize);
            let mediaItemsResponse = await this.googlePhotos.listMediaItems(numOfItems, nextPageToken);

            const mediaItemsInResponse = mediaItemsResponse.mediaItems || [];
            if (mediaItemsInResponse.length === 0 && mediaItemsResponse.nextPageToken) {
                console.error('No mediaItems found in response. Continuing to next page.');
            }

            mediaItemsInResponse.forEach(mediaItem => {
                mediaItems.push(mediaItem);
            });

            nextPageToken = mediaItemsResponse.nextPageToken;
        }

        return mediaItems;
    }

    async downloadMediaItemFiles(mediaItemIds) {
        const mediaItems = await this.googlePhotos.batchGet(mediaItemIds);

        mediaItems.forEach(async (mediaItem) => {
            const where = path.join(this.downloadPath, mediaItem.filename);
            const stream = await this.googlePhotos.createDownloadStream(mediaItem);
            stream.pipe(fs.createWriteStream(where));
        });
    }

    // async downloadAndStoreAllMediaItems() {
    //     let nextPageToken = null;
    //     let shouldContinue = true;
    //
    //     let idx = 1;
    //     let total = 0;
    //     let alreadyGotInPrevPages = new Set();
    //     let numTotalGot = 0;
    //     while (shouldContinue) {
    //         let mediaItemsResponse = await this.googlePhotos.listMediaItems(this.pageSize, nextPageToken);
    //
    //         // if (idx === 10) {
    //         //     shouldContinue = false;
    //         // }
    //
    //         const d1 = now('micro');
    //         // mediaItemsResponse.mediaItems.forEach(mediaItem => {
    //             // this.googlePhotos.storeMediaItem(this.store, mediaItem);
    //         // });
    //         const items = mediaItemsResponse.mediaItems.map(mediaItem => {
    //             return {
    //                 exists: !!this.store.get(mediaItem.id),
    //                 mediaItem
    //             };
    //         });
    //         const exists = items.filter(x => x.exists).map(x => 1).reduce((prev, curr) => prev + curr, 0);
    //         const notExists = items.filter(x => !x.exists);
    //         notExists.forEach(mediaItem => {
    //             this.googlePhotos.storeMediaItem(this.store, mediaItem);
    //         });
    //         const numAlreadyGot = mediaItemsResponse.mediaItems.map(mediaItem => {
    //             const has = alreadyGotInPrevPages.has(mediaItem.id);
    //             alreadyGotInPrevPages.add(mediaItem.id);
    //             return has;
    //         }).filter(x => x).reduce((prev, curr) => prev + curr, 0);
    //
    //         numTotalGot += numAlreadyGot;
    //         const d2 = now('micro');
    //
    //         const len = mediaItemsResponse.mediaItems.length;
    //         if (len > 0) {
    //             const diff = (d2 - d1);
    //             const diffPerItem = diff / len;
    //             console.log(idx++ + ',' + diffPerItem.toFixed(2),
    //                 '       ', exists + '/' + notExists.length +
    //                 '       ' + numAlreadyGot + '/' + numTotalGot,
    //                 '       ', diff.toFixed(2), len, total += len);
    //         }
    //
    //         nextPageToken = mediaItemsResponse.nextPageToken;
    //         // console.log(mediaItemsResponse.mediaItems.length, typeof nextPageToken);
    //     }
    // }
}

module.exports = {
    Downloader
};

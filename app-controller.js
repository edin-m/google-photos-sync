const config = require('./config.json');

const util = require('./util');
const { log } = require('./log');

class AppController {
    constructor(storage, googlePhotos) {
        this.storage = storage;
        this.googlePhotos = googlePhotos;

        const storedItem = {
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
    }

    onMediaItemsDownloaded(mediaItems) {
        console.log('onMediaItemsDownloaded', mediaItems.length);
        mediaItems.forEach(mediaItem => {
            const stored = this.storage.get(mediaItem.id);
            const appData = this._createAppData(stored);
            this.googlePhotos.storeMediaItem(mediaItem, appData);
        });
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
        log.verbose(this, 'onProbedMediaItems', Object.keys(contentLengthMap).length);

        const keys = Object.keys(contentLengthMap);
        const storedItems = keys.map(key => {
            const item = this.storage.get(key);

            if (!item.appData.probe) {
                item.appData.probe = { at: 0, contentLength: 0 }
            }

            item.appData.probe.at = Date.now();
            item.appData.probe.contentLength = contentLengthMap[key];

            return item;
        });

        const forDownload = this._chooseFilesForDownload(storedItems, contentLengthMap);
        log.verbose(this, 'onProbedMediaItems for download', forDownload.length);

        forDownload.forEach(storedItem => storedItem.appData.download = null);

        storedItems.forEach(storedItem => this.storage.set(storedItem.mediaItem.id, storedItem));
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

    findMediaItemsToDownload() {

    }

    _createDownloadFilterFn() {

    }

    _refreshMediaItems(mediaItems) {

    }
}

module.exports = AppController;

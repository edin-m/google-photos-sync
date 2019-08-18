const config = require('./config.json');

const util = require('./util');

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

    findMediaItemIdsToProbe() {
        const storedItemsToProbe = this.storage.getByFilter(
            this._createProbeFilterFn(
                config.probeMediaItemsRefresh.renewIfOlderThanDays
            )
        ).slice(0, config.probeMediaItemsRefresh.numberOfItems);

        return storedItemsToProbe
            .filter(item => item.mediaItem)
            .map(item => item.mediaItem.id);
    }

    _createProbeFilterFn(renewIfOlderThanDays) {
        return value => {
            let hasAppData = value.appData && value.appData.probe;
            let probeDataIsOld = false;

            if (hasAppData) {
                const diff = util.diffBetweenTwoDates(value.appData.probe.at, Date.now(), 'days');
                probeDataIsOld = diff > renewIfOlderThanDays;
            }

            return hasAppData && probeDataIsOld;
        };
    }

    findMediaItemsToDownload() {

    }

    onProbedMediaItems(contentLengthMap) {

    }

    // _updateMediaItem(stored, mediaItem) {
    //     const updatedItem = mediaItem;
    //
    //     if (stored) {
    //         const { mediaItem: storedMediaItem, appData } = stored;
    //
    //         if (storedMediaItem && appData) {
    //
    //         }
    //     }
    //
    //     return updatedItem;
    // }

    _refreshMediaItems(mediaItems) {

    }
}

module.exports = AppController;

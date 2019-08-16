class AppController {
    constructor(storage) {
        this.storage = storage;
    }

    onMediaItemsDownloaded(mediaItems) {
        console.log('onMediaItemsDownloaded', mediaItems.length);
    }

    _refreshMediaItems(mediaItems) {

    }
}

module.exports = AppController;

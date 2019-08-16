const schedule = require('node-schedule');

const config = require('./config.json');

class Scheduler {
    constructor(downloader, appController) {
        this.downloader = downloader;
        this.appController = appController;
        this.jobs = [];
    }

    createJobs() {
        this.jobs.push(this._createMediaItemRefreshJob(config.mediaItemsRefresh.numberOfItems));
    }

    _createMediaItemRefreshJob(numOfItems) {
        return schedule.scheduleJob(config.mediaItemsRefresh.jobCron, () => {
            this.downloader.downloadMediaItems(numOfItems).then(mediaItems => {
                this.appController.onMediaItemsDownloaded(mediaItems);
            });
        });
    }

}

module.exports = Scheduler;

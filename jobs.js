const schedule = require('node-schedule');

const config = require('./config.json');

class Scheduler {
    constructor(downloader, appController) {
        this.downloader = downloader;
        this.appController = appController;
        this.jobs = [];

        this.availableJobs = {
            mediaItemRefresh: {
                fn: this._mediaItemRefreshJobFn,
                params: [Number]
            },
            probeMediaItemRefresh: {
                fn: this._mediaItemRefreshJobFn,
                params: []
            }
        }
    }

    createJobs() {
        this.jobs.push(this._createMediaItemRefreshJob());
    }

    _createMediaItemRefreshJob() {
        return schedule.scheduleJob(
            config.mediaItemsRefresh.jobCron,
            this._mediaItemRefreshJobFn.bind(this, config.mediaItemsRefresh.numberOfItems)
        );
    }

    triggerNow(name, params = []) {
        const job = this.availableJobs[name];

        if (!job) {
            throw new Error(`The job under the name of ${name} does not exist`);
        }

        if (params.length < job.params.length) {
            throw new Error(`Not all params have been provided, required ${job.params.length}`);
        }

        const converted = [...params].slice(0, job.params.length).map((item, idx) => job.params[idx](item));
        return job.fn.apply(this, converted);
    }

    _mediaItemRefreshJobFn(numOfItems) {
        this.downloader.downloadMediaItems(numOfItems).then(mediaItems => {
            this.appController.onMediaItemsDownloaded(mediaItems);
        });
    }

    _probeMediaItemRefreshFn() {
        const mediaItemsToProbe = this.appController.findMediaItemIdsToProbe();

        this.downloader.probeMediaItems(mediaItemsToProbe).then(contentLengthMap => {
            this.appController.onProbedMediaItems(contentLengthMap);
        });
    }

}

module.exports = Scheduler;

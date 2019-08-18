const schedule = require('node-schedule');

const config = require('./config.json');

const { log } = require('./log');

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
                fn: this._probeMediaItemRefreshFn,
                params: [Number, Number]
            },
            downloadMediaItemFile: {
                fn: this._downloadMediaItemFilesJob,
                params: [Number]
            }
        }
    }

    createJobs() {
        this.jobs.push(this._createMediaItemRefreshJob());
        this.jobs.push(this._createProbeMediaItemRefreshJob());
    }

    _createMediaItemRefreshJob() {
        return schedule.scheduleJob(
            config.mediaItemsRefresh.jobCron,
            this._mediaItemRefreshJobFn.bind(this, config.mediaItemsRefresh.numberOfItems)
        );
    }

    _createProbeMediaItemRefreshJob() {
        const { renewIfOlderThanDays, numberOfItems } = config.probeMediaItemsRefresh;
        return schedule.scheduleJob(
            config.probeMediaItemsRefresh.jobCron,
            this._probeMediaItemRefreshFn.bind(this, renewIfOlderThanDays, numberOfItems)
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
        log.info(this, '_mediaItemRefreshJobFn', numOfItems);

        this.downloader.downloadMediaItems(numOfItems).then(mediaItems => {
            this.appController.onMediaItemsDownloaded(mediaItems);
        }).catch(err => console.error(err));
    }

    _probeMediaItemRefreshFn(renewIfOlderThanDays, numberOfItems) {
        log.info(this, '_probeMediaItemRefreshFn', renewIfOlderThanDays, numberOfItems);

        const mediaItemIdsToProbe = this.appController.findMediaItemIdsToProbe(
            renewIfOlderThanDays, numberOfItems
        );
        log.info(this, '_probeMediaItemRefreshFn mediaItemsToProbe', mediaItemIdsToProbe.length);

        this.downloader.probeMediaItems(mediaItemIdsToProbe).then(contentLengthMap => {
            this.appController.onProbedMediaItems(contentLengthMap);
        }).catch(err => console.error(err));
    }

    _downloadMediaItemFilesJob(numberOfItems) {
        log.info(this, '_downloadMediaItemFilesJob', numberOfItems);

        const mediaItemIdsToDownload = this.appController.findMediaItemsToDownload(numberOfItems);
        log.info(this, '_downloadMediaItemFilesJob found', mediaItemIdsToDownload.length);

        this.downloader.downloadMediaItemFiles(mediaItemIdsToDownload)
            .catch(err => console.error(err));
    }

}

module.exports = Scheduler;

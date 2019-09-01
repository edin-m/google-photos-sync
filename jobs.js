const schedule = require('node-schedule');

const config = require('./config.json');

const { log } = require('./log');

class Scheduler {
    constructor(downloader, appController) {
        this.downloader = downloader;
        this.appController = appController;
        this.jobs = [];

        this.availableJobs = {
            probeMediaItemRefresh: {
                fn: this._probeMediaItemRefreshFn,
                params: [Number, Number]
            },
            downloadMediaItemFile: {
                fn: this._downloadMediaItemFilesJob,
                params: [Number]
            },
            searchMediaItemsJob: {
                fn: this._searchMediaItemsJob,
                params: [Number, Number]
            },
            appStartupJob: {
                fn: this._appStartupJob,
                params: []
            }
        }
    }

    createJobs() {
        this.jobs.push(this._createMediaItemSearchJob());
        this.jobs.push(this._createProbeMediaItemRefreshJob());
        this.jobs.push(this._createDownloadMediaItemFilesJob());
    }

    _createMediaItemSearchJob() {
        const unlimitedItems = 0;

        return schedule.scheduleJob(
            config.mediaItemSearchRefresh.jobCron,
            this._searchMediaItemsJob.bind(this, config.mediaItemSearchRefresh.searchDaysBack, unlimitedItems)
        );
    }

    _createProbeMediaItemRefreshJob() {
        const { renewIfOlderThanDays, numberOfItems } = config.probeMediaItemsRefresh;
        return schedule.scheduleJob(
            config.probeMediaItemsRefresh.jobCron,
            this._probeMediaItemRefreshFn.bind(this, renewIfOlderThanDays, numberOfItems)
        );
    }

    _createDownloadMediaItemFilesJob() {
        return schedule.scheduleJob(
            config.mediaItemsDownload.jobCron,
            this._downloadMediaItemFilesJob.bind(this, config.mediaItemsDownload.numberOfItems)
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

    _probeMediaItemRefreshFn(renewIfOlderThanDays, numberOfItems) {
        log.info(this, '');
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
        log.info(this, '');
        log.info(this, '_downloadMediaItemFilesJob', numberOfItems);

        const mediaItemIdsToDownload = this.appController.findMediaItemsToDownload(numberOfItems);
        log.info(this, '_downloadMediaItemFilesJob found', mediaItemIdsToDownload.length);

        this.appController.renewMediaItems(mediaItemIdsToDownload).then(storedItems => {
            const mediaItems = storedItems.map(storedItem => storedItem.mediaItem);
            return this.downloader.downloadMediaItemFiles(mediaItems).then(files => {
                this.appController.onFilesDownloaded(files);
            });
        }).catch(err => console.error(err));
    }

    _searchMediaItemsJob(numOfDaysBack, numOfItems) {
        log.info(this, '');
        log.info(this, '_searchMediaItemsJob', numOfDaysBack, numOfItems);

        if (numOfItems === 0) {
            numOfItems = 9999999999;
        }

        this.downloader.searchMediaItems(numOfDaysBack, numOfItems).then(mediaItems => {
            this.appController.onMediaItemsDownloaded(mediaItems);
        }).catch(err => console.error(err));
    }

    _appStartupJob() {
        log.info(this, '');
        log.info(this, '_appStartupJob');

        const existingFiles = this.downloader.getExistingFiles();
        const storedItemsMap = this.appController.getStoredItemsByFilenameMap(
            existingFiles.map(file => file.filename)
        );

        let files = existingFiles
            .filter(file => storedItemsMap.hasOwnProperty(file.filename))
            .filter(file => this.appController.hasStoredItemDiscrepancy(storedItemsMap[file.filename].storedItem));

        log.info(this, 'files with discrepancies', files.length);

        files.forEach(file => {
            const mediaItem = storedItemsMap[file.filename].storedItem.mediaItem;
            return { valid: true, where: file.where, mediaItem };
        });

        const res = this.appController.onFilesDownloaded(files);
        log.info(this, 'updated info on', res.length, 'already downloaded items');
    }

}

module.exports = Scheduler;

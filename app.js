const request = require('request');
const mkdirp = require('mkdirp');
const fs = require('fs');
const args = require('command-line-args');

const Store = require('./my-key-value-store');
const { AuthStorage, AuthService } = require('./google-auth');
const { GooglePhotos } = require('./google-photos');
const { Downloader } = require('./downloader');
const Scheduler = require('./jobs');
const AppController = require('./app-controller');
const { log } = require('./log');

async function main() {
    const storage = new Store('secrets/photos.data', {
        timespanInMs: 10000
    });

    const authStorage = new AuthStorage();
    const authService = new AuthService(authStorage);
    const googlePhotos = new GooglePhotos(storage, authService);
    const downloadPath = 'google/photos';
    mkdirp(downloadPath);
    const downloader = new Downloader(storage, googlePhotos, downloadPath);
    const appController = new AppController(storage, googlePhotos);
    const scheduler = new Scheduler(downloader, appController);

    const scopes = [GooglePhotos.photosApiReadOnlyScope()];
    await authService.authenticate(scopes);

    const options = args([
        { name: 'job', type: String },
        { name: 'params', type: String, multiple: true },
        { name: 'verbose', alias: 'v', type: Boolean },
        { name: 'count', alias: 'c', type: Boolean }
    ]);

    log.setVerbose(options.verbose);

    if (options.count) {
        console.log('counting');
        log.info(this, 'all media items', storage.getByFilter(item => item.mediaItem).length);
    } else if (options.job) {
        scheduler.triggerNow(options.job, options.params);
    } else {
        scheduler.createJobs();
    }

    console.log('started app');
}

main().catch(err => console.error(err));


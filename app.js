const request = require('request');
const mkdirp = require('mkdirp');
const fs = require('fs');
const args = require('command-line-args');

const config = require('./config.json');

const Store = require('./my-key-value-store');
const { AuthStorage, AuthService } = require('./google-auth');
const { GooglePhotos } = require('./google-photos');
const { Downloader } = require('./downloader');
const Scheduler = require('./jobs');
const AppController = require('./app-controller');
const { log } = require('./log');

async function main() {
    const photoDb = new Store('secrets/photos.data');
    const albumDb = new Store('secrets/albums.db');

    const authStorage = new AuthStorage();
    const authService = new AuthService(authStorage);
    const googlePhotos = new GooglePhotos(authService);
    const downloadPath = config.photosPath;
    const downloader = new Downloader(photoDb, googlePhotos, downloadPath);
    const appController = new AppController(photoDb, albumDb, googlePhotos, downloadPath);
    const scheduler = new Scheduler(downloader, appController);

    const options = args([
        { name: 'job', type: String },
        { name: 'help', alias: 'h', type: Boolean },
        { name: 'albums', type: Boolean },
        { name: 'download-album', type: String },
        { name: 'params', type: String, multiple: true },
        { name: 'verbose', alias: 'v', type: Boolean },
        { name: 'count', alias: 'c', type: Boolean }
    ]);

    if (options.help) {
        log.info(this, 'help');
        return;
    }

    if (options.albums) {
        const albums = await googlePhotos.listAlbums();
        appController.onAlbums(albums);
        return;
    }

    log.setVerbose(options.verbose);

    const scopes = [GooglePhotos.photosApiReadOnlyScope()];
    await authService.authenticate(scopes);

    if (options.count) {
        log.info(this, 'all media items', photoDb.count());
    } else if (options.job) {
        log.info(this, ' asdfdf ', options.job);
        scheduler.triggerNow(options.job, options.params);
    } else {
        log.info(this, '===== App Started =====');
        scheduler.scheduleJobs();
        scheduler.triggerNow('appStartupJob', []);
    }
}

main().catch(err => console.error(err));


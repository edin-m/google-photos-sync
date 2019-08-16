// const Store = require('data-store');
const mkdirp = require('mkdirp');

const Store = require('./my-key-value-store');
const { AuthStorage, AuthService } = require('./google-auth');
const { GooglePhotos } = require('./google-photos');
const { Downloader } = require('./downloader');
const Scheduler = require('./jobs');
const AppController = require('./app-controller');

async function main() {
    const storage = new Store('secrets/photos.data', {
        timespanInMs: 10000
    });

    const authStorage = new AuthStorage();
    const authService = new AuthService(authStorage);
    const googlePhotos = new GooglePhotos(authService);
    const downloadPath = 'google/photos';
    mkdirp(downloadPath);
    const downloader = new Downloader(storage, googlePhotos, downloadPath);
    const appController = new AppController(storage);
    const scheduler = new Scheduler(downloader, appController);

    ///

    const scopes = [GooglePhotos.photosApiReadOnlyScope()];
    await authService.authenticate(scopes);

    scheduler.createJobs();

    console.log('auth service ===');

    // const keys = store.getKeySet();
    // console.log(keys.size);

    // await downloader.downloadAndStoreAllMediaItems();

    // const mediaItems = await downloader.downloadMediaItems(100);
    // console.log('downloaded', mediaItems.length);





    // await scheduler.init();

    // scheduler.agenda.define('refresh 100 mediaItems', (job, done) => {
    //     downloader.downloadMediaItems(100).then(mediaItems => {
    //         console.log('downloaded', mediaItems.length);
    //     }).then(done).catch(done);
    // });
    //
    // scheduler.agenda.every('52 * * * *', 'refresh 100 mediaItems');
    //
    // await scheduler.agenda.start();
    // const mediaItems = await googlePhotos.listMediaItems();
    // console.log(mediaItems);
}

main().catch(err => console.error(err));

// https://accounts.google.com/o/oauth2/v2/auth?scope=email%20profile&response_type=code&state=security_token%3D138r5719ru3e1%26url%3Dhttps://oauth2.example.com/token&redirect_uri=http://localhost:3001/oauth2redirect&client_id=268732907207-hjicm60291mpkqprcgocpb0cm99gfgss.apps.googleusercontent.com

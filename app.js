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



    const mediaItemIds = Array.from(storage.getKeySet()).slice(0, 100);


    await downloader.downloadMediaItemFiles(mediaItemIds);

    //
    // const mediaItems = await googlePhotos.batchGet(mediaItemIds);
    //
    // mediaItems.forEach(async (mediaItem) => {
    //     const where = path.join('./photos', mediaItem.filename);
    //     const stream = await googlePhotos.createDownloadStream(mediaItem);
    //     stream.pipe(fs.createWriteStream(where));
    // });




    //
    //
    // const mediaItemIds = Array.from(storage.getKeySet()).slice(0, 1);
    //
    // mediaItemIds[0] = "AEQpGC_JisHSaENyEOm0mQRFrRs42-_VTnlU2EG7A2-lucxautPIEX8PblHNZU6RY44WN2NLl6lnpjn1Ae1zoHQCUkhvlrtG8w";
    //
    // const res = await googlePhotos.batchGet(mediaItemIds);
    //
    // console.log(res);
    //
    // res.forEach(async (r) => {
    //     const result = await googlePhotos.probeUrlForContentLength(r);
    //     console.log(r.filename, result.headers['content-length']);
    // });
    //





    //
    //
    // const id = "AEQpGC_JisHSaENyEOm0mQRFrRs42-_VTnlU2EG7A2-lucxautPIEX8PblHNZU6RY44WN2NLl6lnpjn1Ae1zoHQCUkhvlrtG8w";
    // const baseurl1 = await googlePhotos.getMediaItem(id);
    //
    // const token = await authService.getToken();
    // const data = {
    //     "width": "1920",
    //     "height": "1080",
    // };
    // // const uri = 'https://lh3.googleusercontent.com/lr/AGWb-e5m3dbRqLUMA0XV9-aV_dymj9bBoDUvINu5JUGx7S4eOhFOXmheNzwLnlAzxRyDCBe3b-jSSf9R9LL1OXWTLksXzzpmy7heEctF_YkGqV8IAUylo0KzkyjqDvwdhczDMxU9zJKWmfcbj1pWhSJzjYNEjMcnMwbqrvy5rUfFLbkCZ-IBZru4dT0-e1j7D2dIXZ4s2jojpLLpB0uSQq6u_VZiID4mYVU9PzQJ3iEvzLvXXj4gJ9xPeK2C4CkPdqILXU1BoGITQ-23mn0-ZdhZODS-jd1skAwm_V8kBISjMJ8YDSG2bnKWaGb90XVe05Bv_jz9Bs8tTOMMZC3oZTch-Z1V4MxmXXtKQT709iKyFrFulKTLxBfpCFR9UEhJWBnnwrcCcie9iTKR1kSjyhs3HZCReZyTjuGhUsZQQdapniJvYQ6aEiF_O-XLTGBmCvJeCG-Lc0_LHn9_edlByjXuhR_f1Y4P1GJuhLnq11PUu6p3KhlWoRyml_4SkinBH526eUxRfAu9rIkY8ne-DPQ9tR1JkISvd7mnsnzGOzVE-B_3Rc5FnE1p7UHH7cOWGhEQjEYGfsjM85XoPZe8EvotN5ilPUvpVI3TfLD9-jbAzgfjZCLf8bcOwqGTSSDTW_E1toxYEzbkJrlf8TDZz4g91cuWZSSBK4WWkwEFvXbIlz71dzgcui4RSu34UOSL1UAC9xKPiASegvH9tPx0gB6c36l5J9KtoGwyOGvZng4_7OkIvrlV-7ZQ-aeJlh1AA60J6iKZA1JBCg2ozBF9547rbCzMxMk46IPV9Pj0QTH7Fy92bzFbD1LuXJGgWomuVTBwJeWFud-_FuyVkxKpxYUMrqMZQlwOJ_ehjbvD7_0-esqbmAQutzZ6u4m0Fedv8nhZEbchKDM';
    // // const videoUri = `${uri}=w${data.width}-h${data.height}`;
    // // const videoUri = `${uri}=dv`;
    // // console.log(videoUri);
    // // console.log(token.access_token);
    //
    //
    // console.log("====");
    // console.log(baseurl1.baseUrl);
    // console.log(baseurl1.filename);
    // console.log("---");
    // console.log((await googlePhotos.getMediaItem(id)).baseUrl);
    // // console.log("---");
    // // console.log(uri);
    // console.log("====");
    //
    //
    // const headers = googlePhotos._headers(token.access_token);
    //
    // let reqreq;
    //
    // reqreq = request.get({
    //     uri: `${baseurl1.baseUrl}=dv`,
    //     auth: {
    //         bearer: token.access_token
    //     }
    // });
    //
    // reqreq.on('response', function (res) {
    //     // console.log(res.statusCode);
    //     console.log(res.headers);
    //     // reqreq.abort();
    // });
    //
    // reqreq.pipe(th2((ch, en, cb) => {
    //     // console.log(Buffer.byteLength(ch));
    //     // console.log(ch.toString().length);
    //     //     reqreq.abort();
    //         cb();
    //     }));
    // reqreq.pipe(fs.createWriteStream('./del.del.mp4'));
    //
    //








    ///

    const scopes = [GooglePhotos.photosApiReadOnlyScope()];
    await authService.authenticate(scopes);

    ///














    //
    // //
    //
    // const mediaItemIds = Array.from(storage.getKeySet()).slice(0, 88);
    //
    // const res = await googlePhotos.batchGet(mediaItemIds);
    //
    // console.log(res.length);
    //
























    ///

    // scheduler.createJobs();

    console.log('auth service ===');

    const options = args([
        { name: 'job', type: String },
        { name: 'params', type: String, multiple: true }
    ]);

    if (options.job) {
        scheduler.triggerNow(options.job, options.params);
    }

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

const URL = require('url').URL;

const request = require('request');

class GooglePhotos {

    constructor(authService) {
        this.authService = authService;
    }

    static listOfScopes() {
        return [
            GooglePhotos.photosApiReadOnlyScope()
        ];
    }

    static photosApiReadOnlyScope() {
        return 'https://www.googleapis.com/auth/photoslibrary.readonly';
    }

    batchGet(mediaItemIds) {

    }

    async listMediaItems(pageSize = 10, nextPageToken = null) {
        const url = new URL(GooglePhotos.APIs.mediaItems);

        !!pageSize && url.searchParams.append('pageSize', pageSize);
        !!nextPageToken && url.searchParams.append('pageToken', nextPageToken);

        return this._getRequest(url.toString());
    }

    async _getRequest(url) {
        const authToken = await this.authService.getToken();
        const headers = this._headers(authToken.access_token);

        return new Promise((resolve, reject) => {
            request(url, { headers }, (err, resp, body) => {
                if (err) {
                    return reject(`Error when GET ${url} ${err}`);
                }
                try {
                    body = JSON.parse(body);
                } catch (err) {
                    return reject(`Error parsing response body ${err}`);
                }
                if (!!body.error) {
                    const { code, message, status } = body.error;
                    return reject(`Error _getRequest ${url} ${code} ${message} ${status}`);
                }
                resolve(body);
            });
        });
    }

    _headers(access_token) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        };
    }

    async storeMediaItem(storage, mediaItem, appData = null) {
        const data = {
            mediaItem,
            appData
        };

        return await storage.set(mediaItem.id, data);
    }



    // async listMediaItems(pageSize = 10, nextPageToken = null ) {
    //     const token = await this.googleOAuth2.getToken();
    //     const headers = GooglePhotosApi.headers(token.res.access_token);
    //
    //     const url = GooglePhotosApi.APIs.mediaItems + '?' +
    //         `${!!pageSize ? 'pageSize=' + pageSize : ''}` +
    //         `${!!nextPageToken ? 'pageToken=' + nextPageToken : ''}`;
    //
    //     console.log(url);
    //
    //     return new Promise((resolve, reject) => {
    //         request(url, { headers }, (err, resp, body) => {
    //             if (err) console.error(err);
    //             const mediaItems = JSON.parse(body);
    //             resolve(mediaItems);
    //         });
    //     });
    // }

    // async getSingleMediaItem(mediaItem) {
    //     // const token = await this.googleOAuth2.getToken();
    //     // const headers = GooglePhotosApi.headers(token.res.access_token);
    //
    //     const { width, height } = mediaItem.mediaMetadata;
    //
    //     const url = `${mediaItem.baseUrl}=w${width}-h${height}`;
    //     request(url).pipe(fs.createWriteStream(`./photos/${mediaItem.filename}`));
    // }
}
GooglePhotos.APIs = {
    mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems'
};

module.exports = {
    GooglePhotos
};

const { URL } = require('url');

const request = require('request');

class GooglePhotos {

    constructor(storage, authService) {
        this.storage = storage;
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

    async getMediaItem(mediaItemId) {
        const url = `${GooglePhotos.APIs.mediaItems}/${mediaItemId}`;

        return this._getRequest(url);
    }

    async batchGet(mediaItemIds) {
        const limit = GooglePhotos.APIs.BATCH_GET_LIMIT;
        const groups = Math.ceil(mediaItemIds.length / limit);

        const groupMediaItemIds = [];

        for (let i = 0; i < groups; i++) {
            const startIdx = i * limit;
            const endIdx = i * limit + limit;

            const sliceIds = mediaItemIds.slice(startIdx, endIdx);
            groupMediaItemIds.push(sliceIds);
        }

        const results = [];

        groupMediaItemIds.forEach(async (sliceIds) => {
            const batch = await this._batchGet(sliceIds);
            batch.forEach(item => results.push(item));
        });

        return results;
    }

    async _batchGet(mediaItemIds) {
        let url = `${GooglePhotos.APIs.mediaItems}:batchGet?`;

        mediaItemIds.forEach(mediaItemId => {
            url += `mediaItemIds=${mediaItemId}&`;
        });

        const result = await this._getRequest(url);
        return this._filterMediaItemResultsByStatus(result.mediaItemResults);
    }

    _filterMediaItemResultsByStatus(mediaItemResults) {
        const mediaItems = mediaItemResults
            .filter(result => !result.status)
            .map(result => result.mediaItem);

        if (mediaItems.length !== mediaItemResults.length) {
            const numOfErrorStatus = mediaItemResults.filter(result => !!result.status);
            console.error(`There are ${numOfErrorStatus} items with error`);
        }

        return mediaItems;
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

    storeMediaItem(mediaItem, appData = null) {
        const data = {
            mediaItem,
            appData
        };

        return this.storage.set(mediaItem.id, data);
    }

    async probeUrlForContentLength(mediaItem) {
        const authToken = await this.authService.getToken();
        const headers = this._headers(authToken.access_token);

        return new Promise((resolve, reject) => {
            const url = this._createDownloadUrl(mediaItem);
            const probeReq = request(url, { headers });

            probeReq.on('response', (res) => {
                res.on('data', function (data) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers
                    });
                    probeReq.abort();
                });
            });

            probeReq.on('error', (err) => {
                console.error(err);
                probeReq.abort();
                reject(err);
            });
        });
    }

    async createDownloadStream(mediaItem) {
        const authToken = await this.authService.getToken();
        const headers = this._headers(authToken.access_token);

        const url = this._createDownloadUrl(mediaItem);

        return request(url, { headers });
    }

    _createDownloadUrl(mediaItem) {
        let downloadParams = "";

        if (mediaItem.mediaMetadata.video) {
            downloadParams += "dv";
        }

        if (mediaItem.mediaMetadata.photo) {
            const { width, height } = mediaItem.mediaMetadata;
            downloadParams += `w${width}-h${height}`;
        }

        return `${mediaItem.baseUrl}=${downloadParams}`;
    }


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
    mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems',
    BATCH_GET_LIMIT: 49
};

module.exports = {
    GooglePhotos
};

const request = require('request');

const util = require('./util');
const { log } = require('./log');

/**
 *
 */
class GooglePhotos {

    constructor(authService) {
        this.authService = authService;
    }

    static photosApiReadOnlyScope() {
        return 'https://www.googleapis.com/auth/photoslibrary.readonly';
    }

    async batchGet(mediaItemIds) {
        const groups = util.createGroups(mediaItemIds, GooglePhotos.APIs.BATCH_GET_LIMIT);
        log.verbose(this, 'batchGet split', mediaItemIds.length, 'into', groups.length, 'groups');

        const results = [];

        const mediaItemGroups = await Promise.all(groups.map(sliceIds => {
            return this._batchGet(sliceIds);
        }));

        mediaItemGroups.forEach(mediaItemGroup => {
            mediaItemGroup.forEach(mediaItem => results.push(mediaItem));
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

    async listAlbums(nextPageToken = null) {
        const albums = [];

        let url = GooglePhotos.APIs.albums;
        do {
            if (nextPageToken != null) {
                url = `${GooglePhotos.APIs.albums}?pageToken=${nextPageToken}`;
            }

            try {
                const response = await this._getRequest(url);
                response.albums.forEach(album => albums.push(album));
                nextPageToken = response.nextPageToken;
            } catch (err) {
                log.error(err);
                nextPageToken = null;
            }

        } while (nextPageToken != null);

        return albums;
    }

    async _getRequest(url) {
        const headers = await this._getHeaders();

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

    async search(searchFilter, numOfItems, pageToken = null) {
        const requestBody = {
            pageSize: numOfItems
        };

        if (searchFilter.albumId) {
            requestBody.albumId = searchFilter.albumId;
        } else {
            requestBody.filters = { };
            searchFilter.populateFilters(requestBody.filters);
        }

        if (pageToken) {
            requestBody.pageToken = pageToken;
        }

        return this._search(requestBody, numOfItems);
    }

    async _search(requestBody) {
        const url = `${GooglePhotos.APIs.mediaItems}:search`;
        const headers = await this._getHeaders();

        return new Promise((resolve, reject) => {
            request.post({ url, headers, json: requestBody }, (err, res, body) => {
                if (err) {
                    return reject(`Error with POST:search ${url} ${err}`);
                }

                if (body.error) {
                    const { code, message, status } = body.error;
                    return reject(`Error with POST:search ${url} ${code} ${message} ${status}`);
                }

                if (!body.mediaItems) {
                    body.mediaItems = [];
                }

                const { mediaItems, nextPageToken } = body;
                resolve({ mediaItems, nextPageToken });
            });
        });
    }

    async probeUrlForContentLength(mediaItem) {
        const headers = this._getHeaders();

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
        const headers = await this._getHeaders();
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

    async _getHeaders() {
        const authToken = await this.authService.getToken();
        return this._headers(authToken.access_token);
    }

    _headers(access_token) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        };
    }
}
GooglePhotos.APIs = {
    mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems',
    albums: 'https://photoslibrary.googleapis.com/v1/albums',
    BATCH_GET_LIMIT: 49
};

/**
 *
 */
class SearchFilters {
    constructor(includeArchivedMedia) {
        this.includeArchivedMedia = includeArchivedMedia;
    }

    setDateFilter(dateFilter) {
        this.dateFilter = dateFilter;
    }

    populateFilters(filters) {
        filters.includeArchivedMedia = this.includeArchivedMedia;
        if (this.dateFilter) {
            filters.dateFilter = {
                dates: this.dateFilter.dates,
                ranges: this.dateFilter.ranges
            };
        }
    }
}

/**
 *
 */
class DateFilter {
    constructor() {
        this.dates = [];
        this.ranges = [];
    }

    addDateFiilter(date) {
        this.dates.push(date);
    }

    addRangeFilter({ startDate, endDate }) {
        this.ranges.push({
            startDate,
            endDate
        });
    }
}

module.exports = {
    GooglePhotos,
    SearchFilters,
    DateFilter
};

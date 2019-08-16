const express = require('express');
const request = require('request');
const opn = require('open');
const http = require('http');
const URL = require('url');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const CREDENTIALS = require('./secrets/credentials.json').web;
//
// class GoogleOAuth2 {
//     constructor() {
//         this.code = {
//             res: {
//                 code: null
//             },
//             date: null
//         };
//         this.auth = {
//             res: {
//                 access_token: null,
//                 scope: null,
//                 expires_in: null,
//                 token_type: null,
//                 id_token: null
//             },
//             date: null
//         };
//         this.port = 3001;
//         this.cbUrl = `http://localhost:${this.port}/oauth2redirect`;
//     }
//
//     async authenticate(scopes = []) {
//         return new Promise((resolve, reject) => {
//             const scopesStr = scopes.join(' ');
//
//             const url = `${CREDENTIALS.auth_uri}?` +
//                 `scope=${scopesStr}&` +
//                 `response_type=code&` +
//                 `redirect_uri=${this.cbUrl}&` +
//                 `client_id=${CREDENTIALS.client_id}`;
//
//             const app = express();
//
//             const server = app.listen(3001, () => {
//                 opn(url, { wait: false }).then(cb => cb.unref());
//             });
//
//             app.get('/oauth2redirect', async(req, res) => {
//                 res.end('Authentication successful! Please return to the console.');
//                 server.close();
//
//                 this.code.res = req.query;
//                 const token = await this.getToken();
//
//                 resolve(token);
//             });
//         });
//     }
//
//     async getToken() {
//         if (this.auth.res.access_token === null) {
//             return new Promise((resolve, reject) => {
//                 request.post(CREDENTIALS.token_uri, {
//                     form: {
//                         code: this.code.res.code,
//                         client_id: CREDENTIALS.client_id,
//                         client_secret: CREDENTIALS.client_secret,
//                         redirect_uri: this.cbUrl,
//                         grant_type: 'authorization_code'
//                     }
//                 }, (err, resp, body) => {
//                     if (err) console.error(err);
//                     this.auth.res = JSON.parse(body);
//                     if (err) {
//                         reject(err);
//                     } else {
//                         resolve(this.auth);
//                     }
//                 });
//             });
//         } else {
//             return this.auth;
//         }
//     }
// }
//
// class GoogleOAuthStorage {
//     constructor(googleOAuth2) {
//         this.googleOAuth2 = googleOAuth2;
//         this.filePath = GoogleOAuthStorage.createFilePath();
//     }
//
//     async saveToken() {
//         const token = await this.googleOAuth2.getToken();
//         fs.writeFileSync(this.filePath, JSON.stringify(token, null, 4));
//     }
//
//     async loadToken() {
//         let loaded = false;
//
//         if (fs.existsSync(this.filePath)) {
//             const auth = JSON.parse(fs.readFileSync(this.filePath).toString());
//             this.googleOAuth2.auth = auth;
//             loaded = true;
//         }
//
//         return loaded;
//     }
//
//     static createFilePath() {
//         return path.join(process.cwd(), 'secrets/token.json');
//     }
// }

// class GooglePhotosApi {
//     constructor(googleOAuth2) {
//         this.googleOAuth2 = googleOAuth2;
//     }
//
//     static listOfScopes() {
//         return [
//             'https://www.googleapis.com/auth/photoslibrary.readonly',
//             'https://www.googleapis.com/auth/drive.appfolder'
//         ];
//     }
//
//     static photosApiReadOnlyScope() {
//         return 'https://www.googleapis.com/auth/photoslibrary.readonly';
//     }
//
//     static headers(access_token) {
//         return {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${access_token}`
//         };
//     }
//
//     async listMediaItems(pageSize = 10, nextPageToken = null ) {
//         const token = await this.googleOAuth2.getToken();
//         const headers = GooglePhotosApi.headers(token.res.access_token);
//
//         const url = GooglePhotosApi.APIs.mediaItems + '?' +
//             `${!!pageSize ? 'pageSize=' + pageSize : ''}` +
//             `${!!nextPageToken ? 'pageToken=' + nextPageToken : ''}`;
//
//         console.log(url);
//
//         return new Promise((resolve, reject) => {
//             request(url, { headers }, (err, resp, body) => {
//                 if (err) console.error(err);
//                 const mediaItems = JSON.parse(body);
//                 resolve(mediaItems);
//             });
//         });
//     }
//
//     async getSingleMediaItem(mediaItem) {
//         // const token = await this.googleOAuth2.getToken();
//         // const headers = GooglePhotosApi.headers(token.res.access_token);
//
//         const { width, height } = mediaItem.mediaMetadata;
//
//         const url = `${mediaItem.baseUrl}=w${width}-h${height}`;
//         request(url).pipe(fs.createWriteStream(`./photos/${mediaItem.filename}`));
//     }
// }
// GooglePhotosApi.APIs = {
//     mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems'
// };


// async function test() {
//     if (!fs.existsSync('./photos')) {
//         fs.mkdirSync('./photos');
//     }
//
//     const auth = new GoogleOAuth2();
//     const storage = new GoogleOAuthStorage(auth);
//
//     const photos = new GooglePhotosApi(auth);
//     const scopes = [].concat(GooglePhotosApi.listOfScopes());
//
//     // if (!await storage.loadToken()) {
//         await auth.authenticate(scopes);
//         storage.saveToken();
//     // }
//
//     let nextPageToken = null;
//
//     while (true) {
//         const mediaItems = (await photos.listMediaItems(null, nextPageToken));
//         nextPageToken = mediaItems.nextPageToken;
//         console.log(nextPageToken);
//         console.log(JSON.stringify(mediaItems, null, 4));
//         const items = mediaItems.mediaItems;
//         console.log(items.length);
//
//         items.forEach(mediaItem => {
//             photos.getSingleMediaItem(mediaItem);
//         });
//
//         console.log();
//         console.log();
//         console.log();
//
//         if (!nextPageToken) {
//             break;
//         }
//     }
// }

// test().catch(err => console.log(err));

class AuthStorage {
    constructor() {
    }

    storeToken(token) {
        const storedToken = {
            token,
            tokenCreatedAt: Date.now()
        };

        const filePath = this._getTokenFilePath();
        fs.writeFileSync(filePath, JSON.stringify(storedToken, null, 4));
    }

    loadToken() {
        let token = null;

        let data = '';
        const filePath = this._getTokenFilePath();
        if (fs.existsSync(filePath)) {
            data += fs.readFileSync(filePath).toString();
        }

        try {
            token = JSON.parse(data);
        } catch (err) {
            console.log(err);
            token = null;
        }

        const isTokenValid = !!token && !!token.token &&
            !!token.token.expires_in && !!token.token.access_token;

        if (isTokenValid) {
            return token;
        }

        return null;
    }

    _getTokenFilePath() {
        return path.join(__dirname, 'secrets/token.json');
    }
}

class AuthService {

    constructor(authStorage) {
        this.authStorage = authStorage;

        this.config = {};
        this.config.requiredScopes = [];
        this.config.listenOnPort = 3001;
        this.config.cbUrl = `http://localhost:${this.config.listenOnPort}/oauth2redirect`;

        this.cachedToken = null;
        this.cbServerTimer = null;
    }

    async getToken() {
        if (!this.cachedToken) {
            this.cachedToken = await this.authenticate(this.config.requiredScopes);
        }
        return this.cachedToken;
    }

    async authenticate(scopes = []) {
        this.config.requiredScopes = scopes;
        const storedToken = this.authStorage.loadToken();

        if (!storedToken) {
            return this._authenticate(scopes);
        }

        let authToken = storedToken.token;

        if (this._isTokenExpired(storedToken)) {
            console.log('expired');
            authToken = this._refreshToken(authToken);
        }

        this.cachedToken = authToken;
        return authToken;
    }

    async _authenticate(scopes = []) {
        return new Promise((resolve, reject) => {
            const url = this._setAuthorizationParameters(scopes, this.config.cbUrl);

            const app = express();

            const server = app.listen(this.config.listenOnPort, () => {
                opn(url, { wait: false }).then(cb => cb.unref());
            });

            app.get('/oauth2redirect', async (req, res) => {
                let msg = this._createMessageFromCbRequest(req);
                res.end(msg);
                server.close();

                if (!!req.query.error) {
                    return reject(`authentication error ${req.query}`);
                }

                const { code, scope: approvedScopes } = req.query;

                if (!this._isRequiredScopesApproved(approvedScopes)) {
                    return reject(`Approved scopes are not sufficient; approved: ${approvedScopes}, required: ${this.config.requiredScopes}`);
                }

                const tokenRequest = this._createAuthorizationTokenRequest(code, this.config.cbUrl);
                const authToken = await this._getToken(tokenRequest);
                console.log('auth token ', authToken.access_token);
                this.authStorage.storeToken(authToken);
                resolve(authToken);

                clearTimeout(this.cbServerTimer);
                server.close();
            });

            this.cbServerTimer = setTimeout(() => server.close(), 30000);
        });
    }

    _setAuthorizationParameters(scopes, cbUrl) {
        const scopesStr = scopes.join(' ');

        return `${CREDENTIALS.auth_uri}?` +
            `scope=${scopesStr}&` +
            `response_type=code&` +
            `redirect_uri=${cbUrl}&` +
            `access_type=offline&` +
            `client_id=${CREDENTIALS.client_id}`;
    }

    _createMessageFromCbRequest(req) {
        let msg = '';

        if (!!req.query.error) {
            msg = JSON.stringify(req.query, null, 4);
        } else {
            msg = 'Authentication successful! Please return to the console.';
        }

        return msg;
    }

    _isRequiredScopesApproved(approvedScopes) {
        const requiredScopesSet = new Set(this.config.requiredScopes);
        const approved = approvedScopes.split(' ').filter(x => requiredScopesSet.has(x));

        return approved.length === this.config.requiredScopes.length;
    }

    _createAuthorizationTokenRequest(code, cbUrl) {
        return {
            code,
            client_id: CREDENTIALS.client_id,
            client_secret: CREDENTIALS.client_secret,
            redirect_uri: cbUrl,
            grant_type: 'authorization_code'
        };
    }

    _isTokenExpired(storedToken) {
        const expiresInInSec = storedToken.token.expires_in;
        const tokenExpiresAt = moment.utc(storedToken.tokenCreatedAt).add(expiresInInSec, 'seconds');

        const diff = tokenExpiresAt.diff(moment.utc(), 'seconds');
        console.log(moment.utc(), tokenExpiresAt, diff);
        return diff <= 10; // sec
    }

    async _refreshToken(authToken) {
        const refreshTokenRequest = this._createRefreshTokenRequest(authToken);
        const refreshToken = await this._getToken(refreshTokenRequest);

        if (!!refreshToken.error) {
            throw new Error(`Could not refresh token. ${refreshToken.error} ${refreshToken.error_description}`);
        }

        const { access_token, expires_in, token_type } = refreshToken;
        authToken.access_token = access_token;
        authToken.expires_in = expires_in;
        authToken.token_type = token_type;

        this.authStorage.storeToken(authToken);

        return authToken;
    }

    _createRefreshTokenRequest(authToken) {
        return {
            refresh_token: authToken.refresh_token,
            client_id: CREDENTIALS.client_id,
            client_secret: CREDENTIALS.client_secret,
            grant_type: 'refresh_token'
        };
    }

    async _getToken(tokenRequest) {
        return new Promise((resolve, reject) => {
            request.post(CREDENTIALS.token_uri, {
                form: tokenRequest
            }, (err, resp, body) => {
                if (err) {
                    console.error('getToken error', err);
                    return reject(err);
                }
                const authToken = JSON.parse(body);
                resolve(authToken);
            });
        });
    }
}

module.exports = {
    AuthStorage,
    AuthService
};


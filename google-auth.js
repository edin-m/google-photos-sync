const express = require('express');
const request = require('request');
const opn = require('open');
const http = require('http');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const CREDENTIALS = require('./secrets/credentials.json').web;

class AuthStorage {

    storeToken(token) {
        const storedToken = {
            token,
            tokenCreatedAt: Date.now()
        };

        const filePath = this._getTokenFilePath();
        fs.writeFileSync(filePath, JSON.stringify(storedToken, null, 4));

        return storedToken;
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
        if (!this.cachedToken || this._isTokenExpired(this.cachedToken)) {
            await this.authenticate(this.config.requiredScopes);
        }

        return this.cachedToken.token;
    }

    async authenticate(scopes = []) {
        this.config.requiredScopes = scopes;
        const storedToken = this.authStorage.loadToken();

        if (!storedToken) {
            return this._authenticate(scopes);
        }

        let authToken = storedToken.token;

        if (this._isTokenExpired(storedToken)) {
            authToken = this._refreshToken(authToken);
        }

        this.cachedToken = this.authStorage.loadToken();
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
        refreshToken.expires_in = expires_in;
        refreshToken.token_type = token_type;

        this.cachedToken = this.authStorage.storeToken(authToken);

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


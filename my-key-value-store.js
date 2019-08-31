const fs = require('fs');
const path = require('path');

const mkdirpSync = require('mkdirp').sync;

function Store(filePath, opts) {
    opts = opts || getDefaultOpts();
    this.opts = opts;
    this.opts.timespanInMs = opts.timespanInMs || getDefaultOpts().timespanInMs;

    this.filePath = filePath;
    this.data = {};
    this.saveTimeout = null;
    this.savingInProgress = false;

    const self = this;

    this.set = function(key, value) {
        if (typeof key === 'object' || key.indexOf('Object') >= 0) {
            throw new Error(`Can't use object as a key ${key} ${value}`);
        }

        key = key.toString();
        this.data[key] = value;

        if (!this.saveTimeout) {
            this.saveTimeout = setTimeout(this._writeFile.bind(this), this.opts.timespanInMs);
        }
    };

    this.get = function(key) {
        key = key.toString();

        const value = this.data[key];

        if (!value) {
            return null;
        }

        return JSON.parse(JSON.stringify(value));
    };

    this.getAll = function () {
        return Object.values(this.data);
    };

    this.getKeySet = function() {
        return new Set(Object.keys(this.data));
    };

    this.getByFilter = function(filterFn, limit) {
        const selected = Object.keys(this.data);

        const items = [];

        limit = limit || selected.length;
        for (
            let i = 0;
            items.length < limit && i < selected.length;
            i++
        ) {
            const key = selected[i];
            const value = this.data[key];

            if (filterFn(value, key)) {
                items.push(value);
            }
        }

        return JSON.parse(JSON.stringify(items));
    };

    this._writeFile = () => {
        if (!this.savingInProgress) {
            const jsonData = JSON.stringify(this.data, null, 2);
            fs.writeFile(this.filePath, jsonData, { mode: 0o0600 }, (err) => {
                if (err) {
                    console.error(err);
                }
                this.saveTimeout = null;
                this.savingInProgress = false;
            });
            this.savingInProgress = true;
        }
    };

    this.load = () => {
        try {
            return (this.data = JSON.parse(fs.readFileSync(this.filePath)));
        } catch (err) {
            if (err.code === 'EACCES') {
                err.message += '\ndata-store does not have permission to load this file\n';
                throw err;
            }
            if (err.code === 'ENOENT' || err.name === 'SyntaxError') {
                this.data = {};
                return {};
            }
            if (err) {
                console.error(err);
            }
        }
    };

    function prepare() {
        mkdirpSync(path.dirname(self.filePath));
        self.load();
    }

    function getDefaultOpts() {
        return {
            timespanInMs: 1000
        };
    }

    prepare();
}

module.exports = Store;

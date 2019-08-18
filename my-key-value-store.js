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
        key = key.toString();
        this.data[key] = value;

        if (!this.saveTimeout) {
            this.saveTimeout = setTimeout(this._writeFile.bind(this), this.opts.timespanInMs);
        }
    };

    this.get = function(key) {
        key = key.toString();

        return this.data[key];
    };

    this.getKeySet = function() {
        return new Set(Object.keys(this.data));
    };

    this.getByFilter = function(filterFn, limit) {
        const selected = Object.keys(this.data)
            .map(k => this.data[k])
            .filter(v => filterFn(v));

        return JSON.parse(JSON.stringify(selected));
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

const moment = require('moment');

class Log {

    constructor() {
        this.verbose_ = true;
    }

    error(who, ...what) {
        console.error(this._msg('ERR', who, ...what));
    }

    log(who, ...what) {
        console.log(this._msg('LOG', who, what));
    }

    info(who, ...what) {
        console.info(this._msg('INF', who, what));
    }

    verbose(who, ...what) {
        this.verbose_ && console.log(this._msg('VER', who, what));
    }

    setVerbose(value) {
        this.verbose_ = value;
    }

    _msg(type, who, ...[what]) {
        let str = '';
        what.forEach(item => {
            if (typeof item === 'object') {
                str += JSON.stringify(item) + ' ';
            } else {
                str += item.toString() + ' ';
            }
        });
        const pre = `${moment().format('YYYY-MM-DD hh:mm:ss')} [${who.constructor.name}] ${type.toUpperCase()} > `.padEnd(55, ' ');
        return pre + str;
    }
}

module.exports = {
    Log,
    log: new Log
};

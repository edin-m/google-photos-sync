const moment = require('moment');

function diffBetweenTwoDates(older, newer, timeItem = 'seconds') {
    return moment.utc(newer).diff(moment.utc(older), timeItem);
}

module.exports = {
    diffBetweenTwoDates
};

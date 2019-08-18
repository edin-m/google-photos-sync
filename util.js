const moment = require('moment');

function diffBetweenTwoDates(older, newer, timeItem = 'seconds') {
    return moment.utc(newer).diff(moment.utc(older), timeItem);
}

function createGroups(items, groupSize) {
    const groups = [];

    const numOfGroups = Math.ceil(items.length / groupSize);
    for (let i = 0; i < numOfGroups; i++) {
        const startIdx = i * groupSize;
        const endIdx = i * groupSize + groupSize;

        const sliceIds = items.slice(startIdx, endIdx);
        groups.push(sliceIds);
    }

    return groups;
}

module.exports = {
    diffBetweenTwoDates,
    createGroups
};

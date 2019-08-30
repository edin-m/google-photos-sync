const moment = require('moment');
const chai = require('chai');
const expect = chai.expect;

const util = require('../util');

describe('test utils', () => {

    it('test diffBetweenTwoDates', () => {
        const now = moment();
        const before = moment().subtract(10, 'days');

        const days = util.diffBetweenTwoDates(before, now, 'days');

        expect(days).to.equal(10);
    });

    it('test createGroups', () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        const groups = util.createGroups(items, 5);

        expect(groups[0].length).to.equal(5);
        expect(groups[1].length).to.equal(4);
    });

});

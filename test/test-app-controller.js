const moment = require('moment');

const chai = require('chai');
const expect = chai.expect;

const AppController = require('../app-controller');

describe('test app controller', () => {

    let appController;

    before(() => {
        appController = new AppController();
    });

    it('expect probe filter to return true', () => {
        const value = {
            appData: {
                probe: {
                    at: moment.utc().subtract(9, 'days')
                }
            }
        };

        const result = appController._createProbeFilterFn(7)(value);
        expect(result).to.equal(true);
    });

    it('expect probe filter to return false', () => {
        const value = {
            appData: {
                probe: {
                    at: moment.utc().subtract(5, 'days')
                }
            }
        };

        const result = appController._createProbeFilterFn(7)(value);
        expect(result).to.equal(false);
    });
});

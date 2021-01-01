const chai = require('chai');

const expect = chai.expect;

const { GooglePhotos, SearchFilters, DateFilter } = require('../google-photos');

describe('google-photos', () => {
    describe('test google-photos service', () => {
        let tokenMock = { access_token: 'MockToken' };
        const authServiceMock = {};
        let googlePhotosService;

        beforeEach(() => {
            authServiceMock.getToken = () => tokenMock;

            googlePhotosService = new GooglePhotos(authServiceMock);
        });

        it('shoulde test _createDownloadUrl image', () => {
            const mediaItem = {
                baseUrl: 'http://baseurl',
                mediaMetadata: {
                    photo: {}
                }
            };
            const url = googlePhotosService._createDownloadUrl(mediaItem);
            expect(url).to.equal('http://baseurl=d');
        });

        it('shoulde test _createDownloadUrl video', () => {
            const mediaItem = {
                baseUrl: 'http://baseurl',
                mediaMetadata: {
                    video: {}
                }
            };
            const url = googlePhotosService._createDownloadUrl(mediaItem);
            expect(url).to.equal('http://baseurl=dv');
        });

        it('should test _getHeaders', async () => {
            const headers = await googlePhotosService._getHeaders();
            expect(headers['Content-Type']).to.equal('application/json');
            expect(headers['Authorization']).to.equal('Bearer MockToken');
        });
    });

    describe('test SearchFilters', () => {
        it('should work constructor()', () => {
            const sf = new SearchFilters(true);
            expect(sf.includeArchivedMedia).to.equal(true);
        });

        it('should setDateFilter', () => {
            const sf = new SearchFilters();
            const df = new DateFilter();
            sf.setDateFilter(df);
            expect(sf.dateFilter).to.be.an.instanceOf(DateFilter);
        });

        it('should test populateFilters', () => {
            const sf = new SearchFilters(true);
            sf.setDateFilter(new DateFilter());
            const filters = {};
            sf.populateFilters(filters);
            expect(Object.is(filters.dateFilter.dates, sf.dateFilter.dates)).is.equal(true);
            expect(Object.is(filters.dateFilter.ranges, sf.dateFilter.ranges)).is.equal(true);
        });
    });

    describe('test DateFilter', () => {
        it('addDateFilter', () => {
            const df = new DateFilter();
            const date = new Date().toString();
            df.addDateFiilter(date);
            df.addDateFiilter(date);
            expect(df.dates).to.have.lengthOf(2);
        });

        it('addRangeFilter', () => {
            const date = new Date().toString();
            const df = new DateFilter();
            df.addRangeFilter({ startDate: date, endDate: date });
            df.addRangeFilter({ startDate: date, endDate: date });
            expect(df.ranges).to.have.lengthOf(2);
        });
    });
});

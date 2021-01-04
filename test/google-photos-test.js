const { EventEmitter } = require('events').EventEmitter;
const chai = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const expect = chai.expect;

const googlePhotos = rewire('../google-photos');
const { GooglePhotos, SearchFilters, DateFilter } = rewire('../google-photos');

describe('google-photos', () => {
    describe('test google-photos service', () => {
        const tokenMock = { access_token: 'MockToken' };
        const mediaItem = {
            baseUrl: 'http://baseurl',
            mediaMetadata: {
                photo: {}
            }
        };
        const authServiceMock = {};
        let googlePhotosService;

        beforeEach(() => {
            authServiceMock.getToken = () => tokenMock;

            googlePhotosService = new GooglePhotos(authServiceMock);
        });

        it('should test search', async () => {
            const fake = sinon.fake.resolves(true);
            googlePhotosService._search = fake;

            const filters = new SearchFilters();
            filters.setDateFilter({ dates: [], ranges: [] });
            const pageToken = 'pageToken';

            await googlePhotosService.search(filters, 11, pageToken);
            const args = fake.getCall(0).args[0];

            expect(args.pageSize).to.equal(11);
            expect(args.filters.dateFilter.dates).to.have.lengthOf(0);
            expect(args.filters.dateFilter.ranges).to.have.lengthOf(0);
        });

        it('should test _search success', async () => {
            const call = cb => cb(null, {}, { mediaItems: [mediaItem], nextPageToken: 'nextPageToken' });
            const requestMock = { post: (_, cb) => call(cb) };
            requestMock.post = sinon.spy(requestMock.post);
            googlePhotosService.request = requestMock;

            const res = await googlePhotosService._search({});

            expect(res.mediaItems.length).to.equal(1);
            expect(res.nextPageToken).to.equal('nextPageToken');
            expect(requestMock.post.getCall(0).args[0].url)
                .to.equal('https://photoslibrary.googleapis.com/v1/mediaItems:search');
        });

        it('should test _search request error', (done) => {
            const requestMock = { post: (_, cb) => cb('error') };
            googlePhotosService.request = requestMock;

            googlePhotosService
                ._search({})
                .catch(err => {
                    expect(/Error with POST/.test(err)).to.equal(true);
                })
                .finally(done);
        });

        it('should test _search body error', (done) => {
            const call = cb => cb(null, null, { error: { code: '5052' }});
            const requestMock = { post: (_, cb) => call(cb) };
            googlePhotosService.request = requestMock;

            googlePhotosService
                ._search({})
                .catch(err => {
                    expect(/5052/.test(err)).to.equal(true);
                    done();
                });
        });

        it('should test probeUrlForContentLength() success', (done) => {
            const probeReq = new EventEmitter;
            const requestMock = sinon.stub().returns(probeReq);
            const abortStub = sinon.stub();
            googlePhotosService.request = requestMock;
            const res = new EventEmitter;
            probeReq.abort = abortStub;

            googlePhotosService
                .probeUrlForContentLength(mediaItem)
                .then(obj => {
                    expect(obj.statusCode).to.equal(201);
                    expect(requestMock.called).to.equal(true);
                    done();
                })
                .catch(done);

            probeReq.emit('response', res);
            res.statusCode = 201;
            res.headers = [];
            res.emit('data');
        });

        it('should test probeUrlForContentLength() error', (done) => {
            const probeReq = new EventEmitter;
            const requestMock = sinon.stub().returns(probeReq);
            const abortStub = sinon.stub();
            googlePhotosService.request = requestMock;
            probeReq.abort = abortStub;

            googlePhotosService
                .probeUrlForContentLength(mediaItem)
                .catch(err => {
                    expect(err).to.equal('500 error');
                    expect(requestMock.called).to.equal(true);
                    done();
                });

            probeReq.emit('error', '500 error');
        });

        it('should test createDownloadStream', async () => {
            const stub = sinon.stub().returns('output');
            googlePhotosService.request = stub;

            const result = await googlePhotosService.createDownloadStream(mediaItem);

            expect(stub.called).to.equal(true);
            expect(result).to.equal('output');
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

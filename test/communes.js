/* eslint-env mocha */
const expect = require('expect.js');
const communes = require('../lib/communes');
const { cloneDeep } = require('lodash');

const fakeGeom = { type: 'Dumb', coordinates: [] };

describe('communes', function () {

  describe('getIndexedDb()', function () {
    describe('bad communes db path', function () {
      it('should throw an error', function () {
        expect(() => communes.getIndexedDb({ communesDbPath: '_' })).to.throwError();
      });
    });

    describe('cpIndex', function () {
      const db = communes.getIndexedDb({ communes: [
        { nom: 'abc', code: '12345', codesPostaux: ['00000', '11111'], centre: fakeGeom, contour: fakeGeom },
        { nom: 'def', code: '23456', codesPostaux: ['11111'], centre: fakeGeom, contour: fakeGeom },
      ].map(cloneDeep) });
      describe('Unknown codePostal', function () {
        it('should not match', function () {
          expect(db.cpIndex.has('22222')).not.to.be.ok();
        });
      });
      describe('codePostal in 1 commune', function () {
        it('should match', function () {
          expect(db.cpIndex.has('00000')).to.be.ok();
        });
        it('should return 1 entry', function () {
          expect(db.cpIndex.get('00000')).to.have.length(1);
        });
      });
      describe('codePostal in 2 communes', function () {
        it('should match', function () {
          expect(db.cpIndex.has('11111')).to.be.ok();
        });
        it('should return 2 entries', function () {
          expect(db.cpIndex.get('11111')).to.have.length(2);
        });
      });
      describe('index size', function () {
        it('should be equals to number of different values (2)', function () {
          expect(Array.from(db.cpIndex.keys())).to.have.length(2);
        });
      });
    });

    describe('inseeIndex', function () {
      const commune1 = { nom: 'abc', code: '12345', codesPostaux: [], centre: fakeGeom, contour: fakeGeom };
      const commune2 = { nom: 'def', code: '23456', codesPostaux: [], centre: fakeGeom, contour: fakeGeom };
      const db = communes.getIndexedDb({ communes: [commune1, commune2].map(cloneDeep) });

      describe('Unknown code', function () {
        it('should not match', function () {
          expect(db.inseeIndex.has('66666')).not.to.be.ok();
        });
      });
      describe('Known code', function () {
        it('should match', function () {
          expect(db.inseeIndex.has('12345')).to.be.ok();
        });
        it('should return 1 entry', function () {
          expect(db.inseeIndex.get('12345')).to.eql(commune1);
        });
      });
      describe('index size', function () {
        it('should be equals to number of different values (2)', function () {
          expect(Array.from(db.inseeIndex.keys())).to.have.length(2);
        });
      });
    });

  });

  describe('queryByCP()', function () {
    const commune1 = { nom: 'abc', code: '12345', codesPostaux: ['00000', '11111'], centre: fakeGeom, contour: fakeGeom };
    const commune2 = { nom: 'def', code: '23456', codesPostaux: ['11111'], centre: fakeGeom, contour: fakeGeom };
    const db = communes.getIndexedDb({ communes: [commune1, commune2].map(cloneDeep) });

    describe('Unknown codePostal', function () {
      it('should return an empty array', function () {
        expect(db.queryByCP('22222')).to.eql([]);
      });
    });
    describe('codePostal present in 1 commune', function () {
      it('should return an array with 1 commune', function () {
        expect(db.queryByCP('00000')).to.eql([commune1]);
      });
    });
    describe('codePostal present in 2 communes', function () {
      it('should return an array with 2 communes', function () {
        expect(db.queryByCP('11111')).to.eql([commune1, commune2]);
      });
    });
  });

  describe('queryByCode()', function () {
    const commune1 = { nom: 'abc', code: '12345', codesPostaux: [], centre: fakeGeom, contour: fakeGeom };
    const commune2 = { nom: 'def', code: '23456', codesPostaux: [], centre: fakeGeom, contour: fakeGeom };
    const db = communes.getIndexedDb({ communes: [commune1, commune2].map(cloneDeep) });

    describe('Unknown code', function () {
      it('should return an empty array', function () {
        expect(db.queryByCode('11111')).to.eql([]);
      });
    });
    describe('Known code', function () {
      it('should return an array with 1 commune', function () {
        expect(db.queryByCode('12345')).to.eql([commune1]);
      });
    });
  });

  describe('queryByLonLat()', function () {
    const geom = { type: 'Polygon', coordinates: [[[-10, -10], [-10, 10], [10, 10], [10, -10], [-10, -10]]] };
    const commune1 = { nom: 'abc', code: '12345', codesPostaux: [], contour: geom };
    const db = communes.getIndexedDb({ communes: [commune1].map(cloneDeep) });

    describe('Point in no man\'s land', function () {
      it('should return an empty array', function () {
        expect(db.queryByLonLat([-20, -20])).to.eql([]);
      });
    });
    describe('Point inside the commune contour', function () {
      it('should return an array with 1 commune', function () {
        expect(db.queryByLonLat([0, 0])).to.eql([commune1]);
      });
    });
  });

  describe('search()', function () {
    const geom1 = { type: 'Polygon', coordinates: [[[-10, -10], [-10, 0], [0, 0], [0, -10], [-10, -10]]] };
    const geom2 = { type: 'Polygon', coordinates: [[[-10, 0], [-10, 10], [0, 10], [0, 0], [-10, 0]]] };
    const geom3 = { type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] };
    const commune1 = { nom: 'abc', code: '12345', codesPostaux: ['11111', '22222'], contour: geom1 };
    const commune2 = { nom: 'efg', code: '23456', codesPostaux: ['11111'], contour: geom2 };
    const commune3 = { nom: 'efg', code: '67890', codesPostaux: ['11111'], contour: geom3 };
    const db = communes.getIndexedDb({ communes: [commune1, commune2, commune3].map(cloneDeep) });

    describe('Simple matching criteria', function () {
      it('should return an array with 1 commune', function () {
        expect(db.search({ code: '12345' })).to.eql([commune1]);
      });
    });

    describe('Disjoint criteria', function () {
      it('should return an empty array', function () {
        expect(db.search({ code: '23456', codePostal: '22222' })).to.eql([]);
      });
    });
    describe('Intersecting criteria (1 commune)', function () {
      it('should return an array with 1 commune', function () {
        expect(db.search({ code: '23456', codePostal: '11111' })).to.eql([commune2]);
      });
    });
    describe('Intersecting criteria (2 communes)', function () {
      it('should return an array with 2 communes', function () {
        expect(db.search({ nom: 'efg', codePostal: '11111' })).to.eql([
          { nom: 'efg', code: '23456', codesPostaux: ['11111'], contour: geom2, _score: 1 },
          { nom: 'efg', code: '67890', codesPostaux: ['11111'], contour: geom3, _score: 1 },
        ]);
      });
    });
    describe('All criteria', function () {
      it('should return an array with 1 commune', function () {
        expect(db.search({ nom: 'efg', code: '67890', codePostal: '11111', lon: 5, lat: 5 })).to.eql([
          { nom: 'efg', code: '67890', codesPostaux: ['11111'], contour: geom3, _score: 1 },
        ]);
      });
    });
  });

});
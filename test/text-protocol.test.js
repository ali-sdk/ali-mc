'use strict';

const assert = require('assert');
const memcached = require('../');
// const pedding = require('pedding');

describe('test/text-protocol.test.js', function() {

  let mc;
  let key;
  before((done) => {
    mc = memcached.createClient({
      port: 11211,
      host: '127.0.0.1',
      protocol: 'text',
    });
    mc.ready(done);
  });

  beforeEach(() => {
    key = 'key' + Date.now();
  });

  after(() => {
    mc.quit();
  });

  it('should set/get success', (done) => {
    const value = 'set/get'
    mc.set(key, value, (err, result) => {
      assert(!err);
      assert(result === true);
      // done();
      mc.get(key, (err, result) => {
        assert(!err);
        assert(result === value);
        done();
      });
    });
  });

  it('should set/append success', (done) => {
    mc.set(key, 'set', (err, result) => {
      assert(!err);
      assert(result === true);
      mc.append(key, '/append', (err, result) => {
        assert(!err);
        assert(result === true);
        mc.get(key, (err, result) => {
          assert(!err);
          assert(result === 'set/append');
          done();
        });
      });
    });
  });

  it('should version success', (done) => {
    mc.version((err, result) => {
      assert(!err);
      assert(result);
      assert(/^[\d\.]+$/.test(result));
      done();
    });
  });

  it('should set/get/delete/get success', (done) => {
    const value = 'set/get/delete/get';
    mc.set(key, value, (err, result) => {
      assert(!err);
      assert(result === true);

      mc.get(key, (err, result) => {
        assert(!err);
        assert(result === value);

        mc.delete(key, (err, result) => {
          assert(!err);
          assert(result === true);

          mc.get(key, (err, result) => {
            assert(!err);
            assert(result == null);
            done();
          });

        });

      });
    });
  });

  it('should verbosity success', (done) => {

    mc.verbosity(0, (err, result) => {
      assert(!err);
      assert(result === true);
      done();
    });

  });

  it('should set/prepend success', (done) => {
    mc.set(key, 'set', (err, result) => {
      assert(!err);
      assert(result === true);
      mc.prepend(key, 'prepend/', (err, result) => {
        assert(!err);
        assert(result === true);
        mc.get(key, (err, result) => {
          assert(!err);
          assert(result === 'prepend/set');
          done();
        });
      });
    });
  });

  it('should set/replace success', (done) => {
    mc.set(key, 'set', (err, result) => {
      assert(!err);
      assert(result === true);
      mc.replace(key, 'replace', (err, result) => {
        assert(!err);
        assert(result === true);
        mc.get(key, (err, result) => {
          assert(!err);
          assert(result === 'replace');
          done();
        });
      });
    });
  });

  it('should set/add haskey success', (done) => {
    mc.set(key, 'set', (err, result) => {
      assert(!err);
      assert(result === true);
      mc.add(key, 'add', (err, result) => {
        assert(!err);
        assert(result === false);
        done();
      });
    });
  });

  it('should set/add nokey success', (done) => {
    mc.add(key, 'add', (err, result) => {
      assert(!err);
      assert(result === true);
      mc.get(key, (err, result) => {
        assert(!err);
        assert(result === 'add');
        done();
      });
    });
  });

  it('should set/set/gets success', (done) => {
    const key1 = key + 1;
    const value1 = 'set/set/gets1';
    const key2 = key + 2;
    const value2 = 'set/set/gets2';
    mc.set(key1, value1, (err, result) => {
      assert(!err);
      assert(result === true);

      mc.set(key2, value2, (err, result) => {
        assert(!err);
        assert(result === true);

        mc.gets([key1, key2], (err, result) => {
          assert(!err);
          assert(result[0].data === value1);
          assert(result[1].data === value2);
          done();
        });

      });

    });
  });

  it('should flushAll success', (done) => {
    mc.flushAll(1, (err, result) => {
      assert(!err);
      assert(result === true);
      done();
    });
  });

});

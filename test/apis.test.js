'use strict';

const assert = require('assert');
const pedding = require('pedding');
const Client = require('../');
const constant = require('../lib/const');
const OPCODE = constant.opcode;
const STATUS = constant.status;
const Long = require('long');
const extrasUtil = require('../lib/extras-util');

const UNDEF = undefined;
const DEF_KEY = '__fool2fishTestKey__';
const DEF_VAL = '__fool2fishTestValue' + Date.now() + '__';
const KEY2 = '__fool2fishTestKey2__';

const options = {
  host: 'c97fb3ae659011e4.m.cnhzaligrpzmfpub001.ocs.aliyuncs.com',
  // host: 'localhost',
  port: 11211,
  username: 'c97fb3ae659011e4',
  password: 'iumTq5691',
};
let ocs;

describe('APIs', function() {
  before(function *() {
    ocs = new Client(options);
  });
  after(function(done) {
    ocs.on('close', done);
    ocs.quit(function(err) {
      assert(!err);
    });
  });

  describe('get', function() {
    before(function *() {
      yield ocs.set(DEF_KEY, DEF_VAL);
      yield * del(KEY2);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should get the value', function *() {
      let rt = yield ocs.get(DEF_KEY);
      assert.equal(rt, DEF_VAL);
    });

    it('should throw when the item dosen\'t exist', function *() {
      try {
        let rt = yield ocs.get(KEY2);
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0001);
      }
    });
  });

  describe('set', function() {
    before(function *() {
      yield * del(DEF_KEY);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should set the item', function *() {
      yield ocs.set(DEF_KEY, DEF_VAL);
    });

    it('should set the Long value', function *() {
      let value = Long.fromValue(12345);
      yield ocs.set(DEF_KEY, value);
      let rt = yield ocs.get(DEF_KEY);
      assert(Long.isLong(rt));
      assert(rt.equals(value));
    });

    it('should set the Boolean value', function *() {
      yield ocs.set(DEF_KEY, true);
      yield * get(DEF_KEY, true);
    });

    it('should set the item with expiration', function *() {
      yield ocs.set(DEF_KEY, DEF_VAL, 1);
      yield wait();
      yield * getWithErr(DEF_KEY, 0x0001);
    });
  });

  describe('add', function() {
    before(function *() {
      yield * del(DEF_KEY);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should add with expiration if the item dosen\'t exist', function *() {
      yield ocs.add(DEF_KEY, DEF_VAL, 1);
      yield wait();
      yield * getWithErr(DEF_KEY, 0x0001);
    });

    it('should add if the item dosen\'t exist', function *() {
      yield ocs.add(DEF_KEY, DEF_VAL);
    });

    it('should throw if the item exist', function *() {
      try {
        yield ocs.add(DEF_KEY, DEF_VAL);
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0002);
      }
    });
  });

  describe('replace', function() {
    before(function *() {
      yield ocs.set(DEF_KEY, DEF_VAL);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should replace if the item exist', function *() {
      yield ocs.replace(DEF_KEY, 'another value');
      yield * get(DEF_KEY, 'another value');
    });

    it('should replace with expiration if the item exist', function *() {
      yield ocs.replace(DEF_KEY, 'special value', 1);
      yield wait();
      yield * getWithErr(DEF_KEY, 0x0001);
    });

    it('should throw if the item dosen\'t exist', function *() {
      try {
        yield ocs.replace(KEY2, DEF_VAL);
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0001);
      }
    });
  });

  describe('delete', function() {
    before(function *() {
      yield ocs.set(DEF_KEY, DEF_VAL);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should delete the item', function *() {
      yield ocs.delete(DEF_KEY);
    });

    it('should throw if the item dosen\'t exist', function *() {
      try {
        yield ocs.delete(DEF_KEY);
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0001);
      }
    });
  });

  describe('increment', function() {
    before(function *() {
      yield * del(DEF_KEY);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should return the initial value if the item dose\'t exist', function *() {
      let rt = yield ocs.increment(DEF_KEY, {
        step: 1,
        initial: 10,
      });
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(10, 0, true)));
    });

    it('should return the incremented value if the item exists', function *() {
      let rt = yield ocs.increment(DEF_KEY);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(11, 0, true)));
    });

    describe('set the value of the counter with add/set/replace', function() {
      it('should be ok if the value data is the ascii presentation of a 64 bit int', function *() {
        yield ocs.set(DEF_KEY, '123');
        let rt = yield ocs.increment(DEF_KEY, 1);
        assert(Long.isLong(rt));
        assert(rt.equals(new Long(124, 0, true)));
      });

      it('should throw if the value data is the byte values of a 64 bit int', function *() {
        yield ocs.set(DEF_KEY, 123);
        try {
          let rt = yield ocs.increment(DEF_KEY, 1);
          assert(false);
        } catch (e) {
          assert.equal(e.code, 0x0006);
        }
      });
    });

    it('should cause the counter to wrap if it is up to the max value of 64 bit unsigned int', function *() {
      yield ocs.set(DEF_KEY, '18446744073709551615'); // max 64 bit unsigned integer
      let rt = yield ocs.increment(DEF_KEY, 1);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(0, 0, true)));
    });
  });

  describe('decrement', function() {
    before(function *() {
      yield * del(DEF_KEY);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should return the initial value if the item dose\'t exist', function *() {
      let rt = yield ocs.decrement(DEF_KEY, {
        step: 1,
        initial: 10,
      });
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(10, 0, true)));
    });

    it('should return the decremented value if the item exists', function *() {
      let rt = yield ocs.decrement(DEF_KEY);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(9, 0, true)));
    });

    it('should will never result in a "negative value" (or cause the counter to "wrap")', function *() {
      yield ocs.set(DEF_KEY, '1');
      let rt = yield ocs.decrement(DEF_KEY, 5);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(0, 0, true)));
    });
  });

  describe('flush', function() {
    beforeEach(function *() {
      yield ocs.set(DEF_KEY, DEF_VAL);
      yield ocs.set(KEY2, DEF_VAL);
    });

    afterEach(function *() {
      yield wait(1);
    });

    it('should flush all items immediately', function *() {
      yield ocs.flush();
      yield * getWithErr(DEF_KEY, 0x0001);
      yield * getWithErr(KEY2, 0x0001);
    });

    it('should flush all items in specified time', function *() {
      yield ocs.flush(2);
      yield * get(DEF_KEY, DEF_VAL);
      yield * get(KEY2, DEF_VAL);
      yield wait();
      yield * getWithErr(DEF_KEY, 0x0001);
      yield * getWithErr(KEY2, 0x0001);
    });
  });

  describe('version', function() {
    it('should work', function *() {
      let rt = yield ocs.version();
    });
  });

  describe('append', function() {
    let v = 'aaa';
    before(function *() {
      yield ocs.set(DEF_KEY, v);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should work', function *() {
      yield ocs.append(DEF_KEY, 'bbb');
      get(DEF_KEY, 'aaabbb');
    });

    it('should throw if the item dose\'t exist', function *() {
      try {
        yield ocs.append(KEY2, 'bbb');
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0005);
      }
    });
  });

  describe('prepend', function() {
    let v = 'aaa';
    before(function *() {
      yield ocs.set(DEF_KEY, v);
    });
    after(function *() {
      yield * del(DEF_KEY);
    });

    it('should work', function *() {
      yield ocs.prepend(DEF_KEY, 'bbb');
      get(DEF_KEY, 'bbbaaa');
    });

    it('should throw if the item dose\'t exist', function *() {
      try {
        yield ocs.prepend(KEY2, 'bbb');
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0005);
      }
    });
  });

  describe('touch', function() {
    before(function *() {
      yield ocs.set(DEF_KEY, DEF_VAL);
    });

    it('should change the item\'s expiration', function *() {
      yield ocs.touch(DEF_KEY);
      yield wait();
      yield * get(DEF_KEY, DEF_VAL);

      yield ocs.touch(DEF_KEY, 1);
      yield wait();
      yield * getWithErr(DEF_KEY, 0x0001);
    });

    it('should throw if the item dose\'t exist', function *() {
      try {
        yield ocs.touch(KEY2);
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0001);
      }
    });
  });

  describe('gat', function() {
    before(function *() {
      yield ocs.set(DEF_KEY, 'ABC');
    });

    it('should change the item\'s expiration with the value in reponse', function *() {
      let rt = yield ocs.gat(DEF_KEY);
      assert.equal(rt, 'ABC');
      yield wait();
      yield * get(DEF_KEY, 'ABC');

      rt = yield ocs.gat(DEF_KEY, 1);
      assert.equal(rt, 'ABC');
      yield wait();
      yield * getWithErr(DEF_KEY, 0x0001);
    });

    it('should throw if the item dose\'t exist', function *() {
      try {
        yield ocs.gat(KEY2);
        assert(false);
      } catch (e) {
        assert.equal(e.code, 0x0001);
      }
    });
  });
});



function * get(k, v) {
  let rt = yield ocs.send(OPCODE.GET, {
    key: k,
  });
  assert.equal(rt, v);
}

function * getWithErr(k, code) {
  try {
    yield ocs.send(OPCODE.GET, {
      key: k,
    });
    assert(false);
  } catch (e) {
    assert.equal(e.code, code);
  }
}

function * del(k) {
  try {
    yield ocs.delete(k);
  } catch (e) {
    assert(e.code === 0x0001);
  }
}

function wait(s) {
  return (cb) => {
    setTimeout(function() {
      cb();
    }, (s || 2) * 1000);
  }
}

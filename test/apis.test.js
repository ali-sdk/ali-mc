'use strict';

const assert = require('power-assert');
const MemcacheClient = require('../');
const constant = require('../lib/const');
const OPCODE = constant.opcode;
const Long = require('long');
const config = require('./fixtures/config');

const DEF_KEY = '__fool2fishTestKey__';
const DEF_VAL = '__fool2fishTestValue' + Date.now() + '__';
const KEY2 = '__fool2fishTestKey2__';

let mc;

describe('test/apis.test.js', () => {
  before(done => {
    mc = new MemcacheClient(config);
    mc.ready(done);
  });

  after(done => {
    mc.on('close', done);
    mc.close(err => {
      assert(!err);
    });
    mc.on('error', err => {
      console.log(err.stack);
    });
  });

  describe('bugfix egg/egg#314', () => {
    it('expired 80', function* () {
      const key = 'expiredKey' + Date.now();
      const value = Date.now() + '';
      try {
        yield mc.delete(key);
      } catch (err) {
        assert(err.message === 'The server returns an error: Key not found');
      }

      yield wait(0.5);
      yield mc.set(key, value, 80);

      const rs = yield mc.get(key);
      assert(rs === value);
    });

    it('expired 8000000', function* () {
      const key = 'expiredKey' + Date.now();
      const value = Date.now() + '';
      try {
        yield mc.delete(key);
      } catch (err) {
        assert(err.message === 'The server returns an error: Key not found');
      }

      yield wait(0.5);
      yield mc.set(key, value, 8000000);

      const rs = yield mc.get(key);
      assert(rs === value);
    });
  });

  describe('get', () => {
    before(function* () {
      yield mc.set(DEF_KEY, DEF_VAL);
      yield del(KEY2);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should get the value by callback', done => {
      mc.get(DEF_KEY, (err, value) => {
        assert(!err);
        assert(value === DEF_VAL);
        done();
      });
    });

    it('should get the value', function* () {
      const rt = yield mc.get(DEF_KEY);
      assert(rt === DEF_VAL);
    });

    it('should throw when the item dosen\'t exist', function* () {
      try {
        yield mc.get(KEY2);
        assert(false);
      } catch (e) {
        assert(e.code === 0x0001);
      }
    });
  });

  describe('set', () => {
    before(function* () {
      yield del(DEF_KEY);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should set the item', function* () {
      yield mc.set(DEF_KEY, DEF_VAL);
    });

    it('should set the Long value', function* () {
      const value = Long.fromValue(12345);
      yield mc.set(DEF_KEY, value);
      const rt = yield mc.get(DEF_KEY);
      assert(Long.isLong(rt));
      assert(rt.equals(value));
    });

    it('should set the Boolean value', function* () {
      yield mc.set(DEF_KEY, true);
      yield get(DEF_KEY, true);
    });

    it('should set the item with expiration', function* () {
      yield mc.set(DEF_KEY, DEF_VAL, 1);
      yield wait();
      yield getWithErr(DEF_KEY, 0x0001);
    });
  });

  describe('add', () => {
    before(function* () {
      yield del(DEF_KEY);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should add with expiration if the item dosen\'t exist', function* () {
      yield mc.add(DEF_KEY, DEF_VAL, 1);
      yield wait();
      yield getWithErr(DEF_KEY, 0x0001);
    });

    it('should add if the item dosen\'t exist', function* () {
      yield mc.add(DEF_KEY, DEF_VAL);
    });

    it('should throw if the item exist', function* () {
      try {
        yield mc.add(DEF_KEY, DEF_VAL);
        assert(false);
      } catch (e) {
        assert(e.code === 0x0002);
      }
    });
  });

  describe('replace', () => {
    before(function* () {
      yield mc.set(DEF_KEY, DEF_VAL);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should replace if the item exist', function* () {
      yield mc.replace(DEF_KEY, 'another value');
      yield get(DEF_KEY, 'another value');
    });

    it('should replace with expiration if the item exist', function* () {
      yield mc.replace(DEF_KEY, 'special value', 1);
      yield wait();
      yield getWithErr(DEF_KEY, 0x0001);
    });

    it('should throw if the item dosen\'t exist', function* () {
      try {
        yield mc.replace(KEY2, DEF_VAL);
        throw new Error('should not run this');
      } catch (e) {
        assert(e.code === 0x0001);
      }
    });
  });

  describe('delete', () => {
    before(function* () {
      yield mc.set(DEF_KEY, DEF_VAL);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should delete the item', function* () {
      yield mc.delete(DEF_KEY);
    });

    it('should throw if the item dosen\'t exist', function* () {
      try {
        yield mc.delete(DEF_KEY);
        throw new Error('should not run this');
      } catch (e) {
        assert(e.code === 0x0001);
      }
    });
  });

  describe('increment', () => {
    before(function* () {
      yield del(DEF_KEY);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should return the initial value if the item dose\'t exist', function* () {
      const rt = yield mc.increment(DEF_KEY, {
        step: 1,
        initial: 10,
      });
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(10, 0, true)));
    });

    it('should return the incremented value if the item exists', function* () {
      const rt = yield mc.increment(DEF_KEY);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(11, 0, true)));
    });

    describe('set the value of the counter with add/set/replace', () => {
      it('should be ok if the value data is the ascii presentation of a 64 bit int', function* () {
        yield mc.set(DEF_KEY, '123');
        const rt = yield mc.increment(DEF_KEY, 1);
        assert(Long.isLong(rt));
        assert(rt.equals(new Long(124, 0, true)));
      });

      it('should throw if the value data is the byte values of a 64 bit int', function* () {
        yield mc.set(DEF_KEY, 123);
        try {
          yield mc.increment(DEF_KEY, 1);
          throw new Error('should not run this');
        } catch (e) {
          assert(e.code === 0x0006);
        }
      });
    });

    it('should cause the counter to wrap if it is up to the max value of 64 bit unsigned int', function* () {
      yield mc.set(DEF_KEY, '18446744073709551615'); // max 64 bit unsigned integer
      const rt = yield mc.increment(DEF_KEY, 1);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(0, 0, true)));
    });

    it('should throw if passed in param is illegal', () => {
      try {
        mc.increment(DEF_KEY, 'step is not a integer');
        throw new Error('should not run this');
      } catch (err) {
        assert(/is not a integer/.test(err.message));
      }

      try {
        mc.increment(DEF_KEY, Math.pow(2, 53) + 2);
        throw new Error('should not run this');
      } catch (err) {
        assert(/is not a safe integer/.test(err.message));
      }

      try {
        mc.increment(DEF_KEY, -2);
        throw new Error('should not run this');
      } catch (err) {
        assert(/must be a non-negative integer/.test(err.message));
      }

      try {
        mc.increment(DEF_KEY, new Long(1, 0));
        throw new Error('should not run this');
      } catch (err) {
        assert(/must be an unsigned long/.test(err.message));
      }
    });
  });

  describe('decrement', () => {
    before(function* () {
      yield del(DEF_KEY);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should return the initial value if the item dose\'t exist', function* () {
      const rt = yield mc.decrement(DEF_KEY, {
        step: 1,
        initial: 10,
      });
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(10, 0, true)));
    });

    it('should return the decremented value if the item exists', function* () {
      const rt = yield mc.decrement(DEF_KEY);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(9, 0, true)));
    });

    it('should will never result in a "negative value" (or cause the counter to "wrap")', function* () {
      yield mc.set(DEF_KEY, '1');
      const rt = yield mc.decrement(DEF_KEY, 5);
      assert(Long.isLong(rt));
      assert(rt.equals(new Long(0, 0, true)));
    });
  });

  describe('flush', () => {
    beforeEach(function* () {
      yield mc.set(DEF_KEY, DEF_VAL);
      yield mc.set(KEY2, DEF_VAL);
    });

    afterEach(function* () {
      yield wait(1);
    });

    it('should flush all items immediately', function* () {
      yield mc.flush();
      yield getWithErr(DEF_KEY, 0x0001);
      yield getWithErr(KEY2, 0x0001);
    });

    it('should flush all items in specified time', function* () {
      yield mc.flush(2);
      yield get(DEF_KEY, DEF_VAL);
      yield get(KEY2, DEF_VAL);
      yield wait();
      yield getWithErr(DEF_KEY, 0x0001);
      yield getWithErr(KEY2, 0x0001);
    });
  });

  describe('version', () => {
    it('should work', function* () {
      yield mc.version();
    });
  });

  describe('append', () => {
    const v = 'aaa';
    before(function* () {
      yield mc.set(DEF_KEY, v);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should work', function* () {
      yield mc.append(DEF_KEY, 'bbb');
      get(DEF_KEY, 'aaabbb');
    });

    it('should throw if the item dose\'t exist', function* () {
      try {
        yield mc.append(KEY2, 'bbb');
        throw new Error('should not run this');
      } catch (e) {
        assert(e.code === 0x0005);
      }
    });
  });

  describe('prepend', () => {
    const v = 'aaa';
    before(function* () {
      yield mc.set(DEF_KEY, v);
    });
    after(function* () {
      yield del(DEF_KEY);
    });

    it('should work', function* () {
      yield mc.prepend(DEF_KEY, 'bbb');
      get(DEF_KEY, 'bbbaaa');
    });

    it('should throw if the item dose\'t exist', function* () {
      try {
        yield mc.prepend(KEY2, 'bbb');
        throw new Error('should not run this');
      } catch (e) {
        assert(e.code === 0x0005);
      }
    });
  });

  describe('touch', () => {
    before(function* () {
      yield mc.set(DEF_KEY, DEF_VAL);
    });

    // memcached in travis ci touch don't work
    if (!process.env.CI) {
      it('should change the item\'s expiration', function* () {
        yield mc.touch(DEF_KEY);
        yield wait();
        yield get(DEF_KEY, DEF_VAL);

        yield mc.touch(DEF_KEY, 1);
        yield wait();
        yield getWithErr(DEF_KEY, 0x0001);
      });
    }

    it('should throw if the item dose\'t exist', function* () {
      try {
        yield mc.touch(KEY2);
        throw new Error('should not run this');
      } catch (e) {
        assert(e.code === 0x0001);
      }
    });
  });

  describe('gat', () => {
    before(function* () {
      yield mc.set(DEF_KEY, 'ABC');
    });

    // memcached in travis ci touch don't work
    if (!process.env.CI) {
      it('should change the item\'s expiration with the value in reponse', function* () {
        let rt = yield mc.gat(DEF_KEY);
        assert.equal(rt, 'ABC');
        yield wait();
        yield get(DEF_KEY, 'ABC');

        rt = yield mc.gat(DEF_KEY, 1);
        assert.equal(rt, 'ABC');
        yield wait();
        yield getWithErr(DEF_KEY, 0x0001);
      });
    }

    it('should throw if the item dose\'t exist', function* () {
      try {
        yield mc.gat(KEY2);
        assert(false);
      } catch (e) {
        assert(e.code === 0x0001);
      }
    });
  });
});

function* get(k, v) {
  const rt = yield mc.send(OPCODE.GET, {
    key: k,
  });
  assert(rt === v);
}

function* getWithErr(k, code) {
  try {
    const r = yield mc.send(OPCODE.GET, {
      key: k,
    });
    throw new Error(`should not run this, get result: ${JSON.stringify(r)}`);
  } catch (e) {
    if (e.code !== code) console.error(e);
    assert(e.code === code);
  }
}

function* del(k) {
  try {
    yield mc.delete(k);
  } catch (e) {
    assert(e.code === 0x0001);
  }
}

function wait(s) {
  s = s || 2;
  return cb => {
    setTimeout(cb, (s + 1) * 1000);
  };
}

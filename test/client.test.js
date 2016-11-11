'use strict';

const assert = require('power-assert');
const memcached = require('../');

const DEF_KEY = '__mcTestKey__';

describe('test/client.test.js', () => {
  let mc;

  before(() => {
    mc = memcached.createClient({
      port: 22211,
      host: '127.0.0.1',
    });
  });

  after(() => mc.close());

  describe('shoud return `The server is not available!` when connection lost.', () => {
    it('should get the value by callback', done => {
      mc.get(DEF_KEY, err => {
        assert(err);
        assert(err.message === 'The server is not available!');
        done();
      });
    });
  });
});

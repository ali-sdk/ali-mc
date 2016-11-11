'use strict';

const assert = require('power-assert');
const memcached = require('../');
const pedding = require('pedding');

describe('exceptions', () => {
  it('should throw error if no host or port', () => {
    try {
      memcached.createClient({});
      throw new Error('should not run this');
    } catch (err) {
      assert(/Host is required!/.test(err.message));
    }

    try {
      memcached.createClient({ host: 'localhost' });
      throw new Error('should not run this');
    } catch (err) {
      assert(/Port is required!/.test(err.message));
    }
  });

  it('should emit error when passed unusable host and port in', done => {
    done = pedding(2, done);
    const mc = memcached.createClient({
      host: 'non-existed-host',
      port: 11211,
    });

    mc.on('error', err => {
      assert(/ENOTFOUND/.test(err.message));
      done();
    });
    mc.on('close', () => {
      done();
    });
  });
});

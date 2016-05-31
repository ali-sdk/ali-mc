'use strict';

const expect = require('expect.js');
const memcached = require('../');
const pedding = require('pedding');

describe('exceptions', function() {
  it('should throw error if no host or port', function() {
    expect(function() {
      memcached.createClient({
      });
    }).to.throwError(/Host is required!/);

    expect(function() {
      memcached.createClient({
        host: 'localhost',
      });
    }).to.throwError(/Port is required!/);
  });

  it('should emit error when passed unusable host and port in', function(done) {
    done = pedding(2, done);
    let mc = memcached.createClient({
      host: 'non-existed-host',
      port: 11211,
    });
    mc.on('error', function(err) {
      expect(err).to.match(/ENOTFOUND/);
      done();
    });
    mc.on('close', function() {
      done();
    });
  });
});

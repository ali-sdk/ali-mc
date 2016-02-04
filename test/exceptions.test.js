'use strict';

const expect = require('expect.js');
const Client = require('../');
const pedding = require('pedding');

describe('exceptions', function() {
  it('should throw error if no host or port', function() {
    expect(function() {
      new Client({
      });
    }).to.throwError(/options\.host is required!/);

    expect(function() {
      new Client({
        host: 'localhost',
      });
    }).to.throwError(/options\.port is required!/);
  });

  it('should emit error when passed unusable host and port in', function(done) {
    done = pedding(2, done);
    let ocs = new Client({
      host: 'localhost',
      port: 11211,
    });
    ocs.on('error', function(err) {
      expect(err).to.match(/ECONNREFUSED/);
      done();
    });
    ocs.on('close', function(err) {
      expect(err).to.match(/ECONNREFUSED/);
      done();
    });
  });
});

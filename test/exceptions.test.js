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
    let mc = new Client({
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

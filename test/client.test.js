'use strict';

const assert = require('assert');
const DEF_KEY = '__mcTestKey__';
const Client = require('../');

describe('client.test.js', function() {

  let mc;

  before(function() {
    mc = new Client({
      port: 11211,
      host: '127.127.127.127',
    });
  });

  describe('shoud return `The server is not available!` when connection lost.', function() {

    it('should get the value by callback', function(done) {
      mc.get(DEF_KEY, function(err) {
        assert(err);
        assert(err.message === 'The server is not available!');
        done();
      });
    });

  });
});

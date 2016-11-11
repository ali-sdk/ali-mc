'use strict';

const assert = require('assert');
const thenify = require('thenify').withCallback;
const BinaryClient = require('./lib/binary-client');

module.exports = BinaryClient;

BinaryClient.createClient = function createClient(options) {
  options = options || {};
  assert(options.host, 'Host is required!');
  assert(options.port, 'Port is required!');
  if (options.protocol === 'text') {
    const TextClient = require('./lib/text-client');
    const client = new TextClient(options);
    [ 'get', 'gets', 'set', 'add', 'touch', 'increment', 'decrement', 'replace', 'append', 'prepend', 'version', 'verbosity', 'flushAll', 'flush' ].forEach(method => {
      client[method] = thenify(client[method]);
    });
    return client;
  }

  return new BinaryClient(options);
};

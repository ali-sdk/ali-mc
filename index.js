/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   tangyao <2001-wms@163.com> (http://tangyao.me/)
 */

'use strict';

const assert = require('assert');
const thenify = require('thenify').withCallback;

/**
 * Aliyun Memcached client.
 */
exports.createClient = function(options) {
  options = options || {};
  assert(options.host, 'Host is required!');
  assert(options.port, 'Port is required!');
  if (options.protocol === 'text') {
    const TextClient = require('./lib/text-client');
    const client = new TextClient(options);
    ['get', 'gets', 'set', 'add', 'touch', 'increment', 'decrement', 'replace', 'append', 'prepend', 'version', 'verbosity', 'flushAll', 'flush'].forEach(method => {
      client[method] = thenify(client[method]);
    });
    return client;
  } else {
    const BinaryClient = require('./lib/binary-client');
    return new BinaryClient(options);
  }
};

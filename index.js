/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   tangyao <2001-wms@163.com> (http://tangyao.me/)
 */

'use strict';

const assert = require('assert');

/**
 * Aliyun Memcached client.
 */
exports.createClient = function(options) {
  options = options || {};
  assert(options.host, 'Host is required!');
  assert(options.port, 'Port is required!');
  if (options.protocol !== 'text') {
    options.protocol = 'binary';
  }
  const Client = require(`./lib/${options.protocol}-client`);
  return new Client(options);
};

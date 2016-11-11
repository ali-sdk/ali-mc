/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

const magic = require('./const').magic;

module.exports = [
  // [name, length, type]
  [ 'magic', 1, 'UInt8' ],
  [ 'opcode', 1, 'UInt8' ],
  [ 'keyLength', 2, 'UInt16BE' ],
  [ 'extrasLength', 1, 'UInt8' ],
  [ 'dataType', 1, 'UInt8' ],
  [ vbucketIdOrStatus, 2, 'UInt16BE' ],
  [ 'totalBodyLength', 4, 'UInt32BE' ],
  [ 'opaque', 4, 'UInt32BE' ],
  [ 'cas', 8, 'buffer' ],
  [ 'extras', 'extrasLength', 'buffer' ],
  [ 'key', 'keyLength', 'buffer' ],
  [ 'value', valueLength, 'buffer' ],
];

function vbucketIdOrStatus() {
  return this.magic === magic.REQUEST ? 'vbucketId' : 'status';
}

function valueLength() {
  return this.totalBodyLength - this.extrasLength - this.keyLength;
}

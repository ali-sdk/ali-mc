/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

const Long = require('long');
const is = require('is');

exports.exp = function(exp) {
  let buf = new Buffer(4);
  buf.writeUInt32BE(exp, 0);
  return buf;
}

exports.flagsExp = function(exp) {
  let buf = new Buffer(8).fill(0);
  buf.writeUInt32BE(exp, 4);
  return buf;
}

exports.xcre = function(step, initial, exp) {
  step = makeUnsignedLong(step);
  initial = makeUnsignedLong(initial);
  let buf = new Buffer(20).fill(0);
  buf.writeUInt32BE(step.high, 0);
  buf.writeUInt32BE(step.low, 4);
  buf.writeUInt32BE(initial.high, 8);
  buf.writeUInt32BE(initial.low, 12);
  buf.writeUInt32BE(exp, 16);
  return buf;
}

function makeUnsignedLong(v) {
  if (is.integer(v)) {
    if (!Number.isSafeInteger(v)) {
      throw new Error(v + ' is not a safe integer');
    }
    if (v < 0) {
      throw new Error(v + ' must be a non-negative integer');
    }
  } else if (Long.isLong(v)) {
    if (!v.unsigned) {
      throw new Error(v + ' must be an unsigned long');
    }
  } else {
    throw new Error(v + ' is not a integer');
  }
  return Long.fromValue(v);
}

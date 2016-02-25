/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

const OPCODE = require('./const').opcode;
const extrasUtil = require('./extras-util');
const is = require('is');
const Long = require('long');

exports.get = function(key, callback) {
  return this.send(OPCODE.GET, {
    key,
  }, callback);
};

exports.set = function(key, value, expired, callback) {
  return sar(this, OPCODE.SET, key, value, expired, callback);
};

exports.add = function(key, value, expired, callback) {
  return sar(this, OPCODE.ADD, key, value, expired, callback);
};

exports.replace = function(key, value, expired, callback) {
  return sar(this, OPCODE.REPLACE, key, value, expired, callback);
};

function sar(mc, opcode, key, value, expired, callback) {
  if (is.undef(expired) || is.function(expired)) {
    callback = expired;
    expired = 0;
  }
  return mc.send(opcode, {
    key,
    value,
    extras: extrasUtil.flagsExp(expired),
  }, callback);
}


exports.delete = function(key, callback) {
  return this.send(OPCODE.DELETE, {
    key: key,
  }, callback);
};


exports.increment = function(key, step, callback) {
  return xcre(this, OPCODE.INCREMENT, key, step, callback);
};

exports.decrement = function(key, step, callback) {
  return xcre(this, OPCODE.DECREMENT, key, step, callback);
};

function xcre(ocs, opcode, key, step, callback) {
  if (is.undef(step) || is.function(step)) {
    callback = step;
    step = 1;
  }
  let extras = step;
  if (Long.isLong(step) || !is.object(step)) {
    extras = {
      step: step,
    };
  }
  return ocs.send(opcode, {
    key,
    extras: extrasUtil.xcre(extras.step || 1, extras.initial || 1, extras.expired || 0),
  }, callback);
}

// after send flush command, should wait a moment before send another command,
// or it may get an successful response but actually fail.
exports.flush = function(expired, callback) {
  if (is.undef(expired) || is.function(expired)) {
    callback = expired;
    expired = 0;
  }
  return this.send(OPCODE.FLUSH, {
    extras: extrasUtil.exp(expired),
  }, callback);
};


exports.version = function(callback) {
  return this.send(OPCODE.VERSION, callback);
};


exports.append = function(key, value, callback) {
  return this.send(OPCODE.APPEND, {
    key,
    value,
  }, callback);
};

exports.prepend = function(key, value, callback) {
  return this.send(OPCODE.PREPEND, {
    key,
    value,
  }, callback);
};


exports.touch = function(key, expired, callback) {
  if (is.undef(expired) || is.function(expired)) {
    callback = expired;
    expired = 0;
  }
  return this.send(OPCODE.TOUCH, {
    key,
    extras: extrasUtil.exp(expired),
  }, callback);
};

exports.gat = function(key, expired, callback) {
  if (is.undef(expired) || is.function(expired)) {
    callback = expired;
    expired = 0;
  }
  return this.send(OPCODE.GAT, {
    key,
    extras: extrasUtil.exp(expired),
  }, callback);
};

/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

const debug = require('debug')('ocs:methods');
const assert = require('assert');
const OPCODE = require('./const').opcode;
const extrasUtil = require('./extras-util');


exports.get = function(key, callback) {
  return this.send(OPCODE.GET, {
    key: key,
  }, callback);
}

exports.set = function(key, value, expired, callback) {
  return this.send(OPCODE.SET, {
    key: key,
    value: value,
    extras: extrasUtil.flagsExp(expired),
  }, callback);
}

exports.add = function(key, value, expired, callback) {
  return this.send(OPCODE.ADD, {
    key: key,
    value: value,
    expired: extrasUtil.flagsExp(expired),
  }, callback);
}

exports.replace = function (key, value, expired, callback) {
  return this.send(OPCODE.REPLACE, {
    key: key,
    value: value,
    expired: extrasUtil.flagsExp(expired),
  }, callback);
}

exports.delete = function (key, callback) {
  return this.send(OPCODE.DELETE, {
    key: key,
  }, callback);
}

exports.increment = function (key, step, options, callback) {

}

exports.decrement = function (key, step, options, callback) {

}


// WARNING: after send flush command, you should wait a moment before send another command,\n' +
// '        or it may get an successful response but actually fail.');
exports.flush = function (callback) {

}

exports.version = function (callback) {

}

exports.append = function (key, value, callback) {

}

exports.prepend = function (key, value, callback) {

}

exports.touch = function (key, expired, callback) {

}

exports.gat = function () {
  
}

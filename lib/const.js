/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

exports.magic = {
  REQUEST: 0x80,
  RESPONSE: 0x81,
};

exports.status = {
  0x0000: 'No error',
  0x0001: 'Key not found',
  0x0002: 'Key exists',
  0x0003: 'Value too large',
  0x0004: 'Invalid arguments',
  0x0005: 'Item not stored',
  0x0006: 'Incr/Decr on non-numeric value.',
  0x0007: 'The vbucket belongs to another server',
  0x0008: 'Authentication error',
  0x0009: 'Authentication continue',

  // defined by sasl protocl
  0x0020: 'Auth error',
  0x0021: 'Auth continue',

  0x0081: 'Unknown command',
  0x0082: 'Out of memory',
  0x0083: 'Not supported',
  0x0084: 'Internal error',
  0x0085: 'Busy',
  0x0086: 'Temporary failure',
};

exports.opcode = {
  GET: 0x00,
  SET: 0x01,
  ADD: 0x02,
  REPLACE: 0x03,
  DELETE: 0x04,
  INCREMENT: 0x05,
  DECREMENT: 0x06,
  QUIT: 0x07,
  FLUSH: 0x08,
  // GETQ: 0x09,
  NO_OP: 0x0a,
  VERSION: 0x0b,
  // GETK: 0x0c,
  // GETKQ: 0x0d,
  APPEND: 0x0e,
  PREPEND: 0x0f,
  // STAT: 0x10,
  // SETQ: 0x11,
  // ADDQ: 0x12,
  // REPLACEQ: 0x13,
  // DELETEQ: 0x14,
  // INCREMENTQ: 0x15,
  // DECREMENTQ: 0x16,
  // QUITQ: 0x17,
  // FLUSHQ: 0x18,
  // APPENDQ: 0x19,
  // PREPENDQ: 0x1a,
  // VERBOSITY: 0x1b,
  TOUCH: 0x1c,
  GAT: 0x1d,
  // GATQ: 0x1e,
  SASL_LIST_MECHS: 0x20,
  SASL_AUTH: 0x21,
  // SASL_STEP: 0x22,
  // RGET: 0x30,
  // RSET: 0x31,
  // RSETQ: 0x32,
  // RAPPEND: 0x33,
  // RAPPENDQ: 0x34,
  // RPREPEND: 0x35,
  // RPREPENDQ: 0x36,
  // RDELETE: 0x37,
  // RDELETEQ: 0x38,
  // RINCR: 0x39,
  // RINCRQ: 0x3a,
  // RDECR: 0x3b,
  // RDECRQ: 0x3c,
  // SET_VBUCKET: 0x3d,
  // GET_VBUCKET: 0x3e,
  // DEL_VBUCKET: 0x3f,
  // TAP_CONNECT: 0x40,
  // TAP_MUTATION: 0x41,
  // TAP_DELETE: 0x42,
  // TAP_FlUSH: 0x43,
  // TAP_OPAQUE: 0x44,
  // TAP_VBUCKET_SET: 0x45,
  // TAP_CHECKPOINT_START: 0x46,
  // TAP_CHECKPOINT_END: 0x47,
};

exports.dataType = {
  RAW_BYTES: 0x00,
};

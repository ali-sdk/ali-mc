/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

const debug = require('debug')('ocs:transcoder');
const zlib = require('zlib');
const Long = require('long');
const is = require('is');
const assert = require('assert');
const io = require('java.io');
const InputObjectStream = io.InputObjectStream;
const OutputObjectStream = io.OutputObjectStream;

const COMPRESSION_THRESHOLD = 16384;
const CHARSET = 'utf8';

const MAX_INT = Math.pow(2, 31) - 1;
const MIN_INT = -Math.pow(2, 31);

// General flags
const SERIALIZED = 1;
const COMPRESSED = 2;

// Special flags for specially handled types.
const SPECIAL_MASK = 0xff00;
const SPECIAL_STRING = 0;
const SPECIAL_BOOLEAN = 1 << 8;
const SPECIAL_INT = 2 << 8;
const SPECIAL_LONG = 3 << 8;
const SPECIAL_DATE = 4 << 8;
const SPECIAL_BYTE = 5 << 8;
const SPECIAL_FLOAT = 6 << 8;
const SPECIAL_DOUBLE = 7 << 8;
const SPECIAL_BYTEARRAY = 8 << 8;


exports.encode = function(o, callback) {
  let buf;
  let flags = 0;

  if (is.string(o)) {
    buf = new Buffer(o);
    flags |= SPECIAL_STRING;
  } else if (is.boolean(o)) {
    buf = new Buffer([o ? 1 : 0]);
    flags |= SPECIAL_BOOLEAN;
  // } else if (isByte(o)) {   // java version only
  // } else if (isShort(o)) {  // java version encode it with java.io
  } else if (isInt(o)) {
    buf = new Buffer(4);
    buf.writeInt32BE(o);
    buf = pack(buf, 4);
    flags |= SPECIAL_INT;
  } else if (isLong(o)) {
    if (!Long.isLong(o)) {
      assert(Number.isSafeInteger(o), 'the number is too big to a safe integer');
    }
    buf = writeLong(o);
    buf = pack(buf, 8);
    flags |= SPECIAL_LONG;
  // } else if (isFloat(o)) {   // java version only
  } else if (isDouble(o)) {
    buf = new Buffer(8);
    buf.writeDoubleBE(o);
    buf = pack(buf, 8);
    flags |= SPECIAL_DOUBLE;
  } else if (is.date(o)) {
    buf = writeLong(o.getTime());
    buf = pack(buf, 8);
    flags |= SPECIAL_DATE;
  } else if (Buffer.isBuffer(o)) {
    buf = o;
    flags |= SPECIAL_BYTEARRAY;
  } else {
    buf = OutputObjectStream.writeObject(o);
    flags |= SERIALIZED;
  }

  if (buf.length > COMPRESSION_THRESHOLD) {
    zlib.gzip(buf, function(err, cbuf) {
      if (err) {
        return callback(err, null, null);
      }
      if (cbuf.length < buf.length) {
        flags |= COMPRESSED;
        callback(null, flags, cbuf);
      } else {
        debug('compression increased the size from %d to %d', buf.length, cbuf.length);
        callback(null, flags, buf);
      }
    });
  } else {
    callback(null, flags, buf);
  }
};


exports.decode = function(flags, buf, callback) {
  if (flags & COMPRESSED) {
    zlib.unzip(buf, function(err, dcbuf) {
      if (err) {
        return callback(err, null, null);
      }
      decode(flags, dcbuf, callback);
    });
  } else {
    decode(flags, buf, callback);
  }
};

function decode(flags, buf, callback) {
  let err;
  let o;
  if (flags & SERIALIZED) {
    o = InputObjectStream.readObject(buf);
  } else {
    let specialFlags = flags & SPECIAL_MASK;
    switch (specialFlags) {
    case SPECIAL_STRING:
      o = buf.toString(CHARSET);
      break;
    case SPECIAL_BOOLEAN:
      o = buf[0] === 1;
      break;
    case SPECIAL_BYTE:
      o = 0;
      if (buf.length) {
        o = buf[0];
      }
      break;
    // case SPECIAL_SHORT: // java version decode it with java.io
    case SPECIAL_INT:
      buf = unpack(buf, 4);
      o = buf.readInt32BE(0);
      break;
    case SPECIAL_LONG:
      buf = unpack(buf, 8);
      o = new Long(buf.readInt32BE(4), buf.readInt32BE(0));
      break;
    case SPECIAL_FLOAT:
      buf = unpack(buf, 4);
      o = buf.readFloatBE(0);
      break;
    case SPECIAL_DOUBLE:
      buf = unpack(buf, 8);
      o = buf.readDoubleBE(0);
      break;
    case SPECIAL_DATE:
      buf = unpack(buf, 8);
      let time = new Long(buf.readInt32BE(4), buf.readInt32BE(0));
      o = new Date(time.toNumber());
      break;
    case SPECIAL_BYTEARRAY:
      o = buf;
      break;
    default:
      err = new Error('cannot decode with flags 0x' + String(flags));
    }
  }
  callback(err, o);
}


/*
 * pack leading zeros
 * buf<0012> => buf<12>
 */
function pack(buf) {
  let pos = 0;
  while (buf[pos] === 0 && pos < buf.length) {
    pos++;
  }
  if (pos === 0) return buf;
  let pbuf = new Buffer(buf.length - pos);
  buf.copy(pbuf, 0, pos);
  return pbuf;
}

/*
 * unpack buffer to specified length with leading zeros
 * unpack(buf<12>, 4) => buf<0012>
 */
function unpack(buf, length) {
  return Buffer.concat([new Buffer(length - buf.length).fill(0), buf]);
}

function isInt(o) {
  return is.integer(o) && o <= MAX_INT && o >= MIN_INT;
}

function isLong(o) {
  return Long.isLong(o) || is.integer(o) && (o > MAX_INT || o < MIN_INT);
}

function isDouble(o) {
  return is.number(o) && !is.integer(o);
}

function writeLong(o) {
  o = Long.fromValue(o);
  let buf = new Buffer(8);
  buf.writeInt32BE(o.high, 0);
  buf.writeInt32BE(o.low, 4);
  return buf;
}

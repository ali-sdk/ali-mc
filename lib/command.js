'use strict';

const debug = require('debug')('ocs:command');
const is = require('is');
const constant = require('./const');
const protocol = require('./protocol');

class Command {
  constructor(data) {
    Object.assign(this, data);
    this.magic = this.magic || constant.magic.REQUEST;
    if (!is.integer(this.opaque)) {
      this.opaque = opaque();
    }
  }

  set extrasLength(v) {
    this._extrasLength = v;
  }
  get extrasLength() {
    return this._extrasLength || calLen(this.extras) || 0;
  }

  set keyLength(v) {
    this._keyLength = v;
  }
  get keyLength() {
    return this._keyLength || calLen(this.key) || 0;
  }

  set totalBodyLength(v) {
    this._totalBodyLength = v;
  }
  get totalBodyLength() {
    // must read this.totalBodyLength first
    // or calLen(this.value) will return 0 when decode because it is not decoded yet
    return this._totalBodyLength || this.extrasLength + this.keyLength + calLen(this.value) || 0;
  }

  encode() {
    const bufs = [];
    protocol.forEach(item => {
      const name = getName(this, item);
      const value = this[name];
      const rawLen = item[1];
      const type = item[2];
      let buf;

      if (type === 'buffer') {
        if (value) {
          const len = calLen(value);
          if (is.number(rawLen) && len !== rawLen) {
            throw new Error(name + '\'s byte length is not equals to ' + rawLen);
          }
          // string or buffer both are ok
          buf = new Buffer(value);

        } else {
          if (is.number(rawLen)) {
            buf = new Buffer(rawLen).fill(0);
          } else {
            // do nothing
          }
        }

      } else {
        buf = new Buffer(rawLen);
        buf['write' + type](value || 0, 0);
      }

      buf && bufs.push(buf);
    });

    const bytes = Buffer.concat(bufs);
    debug('encode command to buffer', bytes);
    return bytes;
  }


  static decodeFromStream(stream, callback) {
    let bufs = [];
    let cmd = new Command();
    let idx = 0; // item index

    stream.on('readable', () => {
      let buf;
      let len;

      // eslint-disable-next-line
      while (buf = stream.read(len = getLen(cmd, protocol[idx]))) {
        if (buf.length !== len) {
          // TODO there must be something wrong
          debug('TODO: buffer\'length is not equals to expected length');
        }

        bufs.push(buf);

        const item = protocol[idx];
        const name = getName(cmd, item);
        const type = item[2];

        let value;
        if (type === 'buffer') {
          value = buf;
        } else {
          value = buf['read' + type](0);
        }
        cmd[name] = value;

        // eslint-disable-next-line
        while (++idx < protocol.length && getLen(cmd, protocol[idx]) === 0) {}

        if (idx === protocol.length) {
          debug('decode command from buffer', Buffer.concat(bufs));
          callback(null, cmd);
          bufs = [];
          cmd = new Command();
          idx = 0;
        }
      }
    });
  }
}


function getName(obj, item) {
  const rawName = item[0];
  return is.function(rawName) ? rawName.call(obj) : rawName;
}

function getLen(obj, item) {
  const rawLen = item[1];
  const len = rawLen;
  if (is.string(rawLen)) {
    return obj[rawLen];
  } else if (is.function(rawLen)) {
    return rawLen.call(obj);
  }
  return len;
}

function calLen(v) {
  if (!v) {
    return 0;
  } else if (Buffer.isBuffer(v)) {
    return v.length;
  } else if (is.string(v)) {
    return Buffer.byteLength(v);
  }

  throw new Error('cannot calculate the length, passed in value must be a string or a buffer');
}


function opaque() {
  if (opaque.current > opaque.MAX) {
    opaque.current = opaque.MIN;
  }
  return opaque.current++;
}
opaque.MAX = Math.pow(2, 30);
opaque.MIN = 0;
opaque.current = opaque.MIN;


module.exports = Command;

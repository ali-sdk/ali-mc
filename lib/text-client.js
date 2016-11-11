'use strict';

const debug = require('debug')('mc:text');
const Base = require('sdk-base');
const net = require('net');
const consts = require('./const');
const assert = require('assert');
const is = require('is');

/**
 * Aliyun Memcached client.
 * @see [binary protocol](https://github.com/memcached/memcached/blob/master/doc/protocol.txt)
 */
class Client extends Base {
  constructor(options) {
    super();
    this.config = options || {};
    this.logger = this.config.logger || console;
    this.req = 0;
    this.received = ''; // all of the received data
    this.callbacks = [];
    this.init();
  }

  init() {
    debug('connect config: %j', this.config);
    const connection = net.createConnection({
      host: this.config.host,
      port: this.config.port,
    }, () => {
      this.logger.info('Client connected.');
      this.connected = true;
      this.ready(true);
    });
    connection.on('data', data => {
      debug('recive data: %s', data);
      this.received += data;
      this.handleData();
    });
    connection.on('end', () => {
      debug('end');
      this.connected = false;
    });
    connection.on('error', err => {
      this.logger.error(err);
    });
    this.connection = connection;
  }

  getHandler() {
    let str = this.readline();
    debug('readline: %s', str);
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    const rs = [];
    while (str !== 'END') {
      rs.push(str);
      str = this.readline();
    }
    const meta = (rs[0] || '').split(' ');
    const result = {
      data: rs[1],
      meta: {
        type: meta[0],
        key: meta[1],
        flags: meta[2],
        bytes: meta[3],
        body: str,
      },
    };
    return result;
  }

  getsHandler() {
    let str = this.readline();
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    const rs = [];
    while (str !== 'END') {
      rs.push(str);
      str = this.readline();
    }
    const result = [];
    for (let i = 0, len = rs.length / 2; i < len; i++) {
      const currentIndex = i * 2;
      const meta = (rs[currentIndex] || '').split(' ');
      result.push({
        data: rs[currentIndex + 1],
        meta: {
          type: meta[0],
          key: meta[1],
          flags: meta[2],
          bytes: meta[3],
          body: rs,
        },
      });
    }
    debug('gets result: %j', result);
    return result;
  }

  storeHandler() {
    const str = this.readline();
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    const result = {
      data: str === 'STORED',
      meta: {
        body: str,
      },
    };
    return result;
  }

  errorHandler(str) {
    const data = str.split(' ');
    switch (data[0]) {
      case 'ERROR':
        return new Error('Nonexistent command name.');
      case 'CLIENT_ERROR':
      case 'SERVER_ERROR':
        return {
          data: null,
          error: new Error(data[1]),
          mete: {
            body: str,
          },
        };
      default:
        return;
    }
  }

  deleteHandler() {
    const str = this.readline();
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    const result = {
      data: str === 'DELETED',
      meta: {
        body: str,
      },
    };
    return result;
  }

  readline() {
    const idx = this.received.indexOf(consts.terminated);
    const str = this.received.substr(0, idx);
    this.received = this.received.substr(idx + 2);
    return str;
  }

  handleData() {
    while (this.received && this.callbacks.length) {
      const callback = this.callbacks.shift();
      const result = this[`${callback.cmd}Handler`].apply(this);
      let err = null;
      if (result && result.constructor.name === 'Error') {
        err = result;
      }
      debug('result: %j', result);
      if (typeof callback.fun === 'function') {
        const data = Array.isArray(result) ? result : result.data;
        callback.fun.apply(this, [ err, data ]);
      }
    }
  }

  get(key, callback) {
    this.callbacks.push({ id: this.req++, cmd: 'get', fun: callback });
    this.connection.write(`get ${key}${consts.terminated}`);
  }

  // The command "delete" allows for explicit deletion of items
  delete(key, callback) {
    this.callbacks.push({ id: this.req++, cmd: 'delete', fun: callback });
    this.connection.write(`delete ${key}${consts.terminated}`);
  }

  gets(key, callback) {
    if (Array.isArray(key)) {
      key = key.join(' ');
    }
    this.callbacks.push({ id: this.req++, cmd: 'gets', fun: callback });
    this.connection.write(`gets ${key}${consts.terminated}`);
  }

  // "set" means "store this data".
  set(key, value, exptime, callback) {
    if (typeof callback !== 'function') {
      callback = exptime;
      exptime = 0;
    }
    this.storage('set', key, value, this.req++, exptime, callback);
  }

  // "add" means "store this data, but only if the server *doesn't* already hold data for this key".
  add(key, value, exptime, callback) {
    if (typeof callback !== 'function') {
      callback = exptime;
      exptime = 0;
    }
    this.storage('add', key, value, this.req++, exptime, callback);
  }

  // "replace" means "store this data, but only if the server *does* already hold data for this key".
  replace(key, value, exptime, callback) {
    if (typeof callback !== 'function') {
      callback = exptime;
      exptime = 0;
    }
    this.storage('replace', key, value, this.req++, exptime, callback);
  }

  // The append and prepend commands do not accept flags or exptime.
  // They update existing data portions, and ignore new flag and exptime
  // settings.
  // "append" means "add this data to an existing key after existing data".
  append(key, value, callback) {
    this.storage('append', key, value, this.req++, 0, callback);
  }

  // "prepend" means "add this data to an existing key before existing data".
  prepend(key, value, callback) {
    this.storage('prepend', key, value, this.req++, 0, callback);
  }

  storage(cmd, key, value, flags, exptime, callback) {
    assert(is.string(value), `Type of value with command "${cmd}" must be String`);
    const val = new Buffer(value);
    const arr = [ cmd, key, flags, exptime, val.length, consts.noreply ];
    const data = arr.join(' ') + consts.terminated + value + consts.terminated;
    debug('storage: ', data);
    this.callbacks.push({ id: flags, cmd: 'store', fun: callback });
    this.connection.write(data);
  }

  versionHandler() {
    const str = this.readline();
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    const data = str.split(' ');
    return {
      data: data[1],
      meta: {
        body: str,
      },
    };
  }

  version(callback) {
    this.callbacks.push({ id: this.req++, cmd: 'version', fun: callback });
    this.connection.write(`version${consts.terminated}`);
  }

  verbosityHandler() {
    const str = this.readline();
    debug('verbosityHandler: %s', str);
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    return {
      data: str === 'OK',
      meta: {
        body: str,
      },
    };
  }

  // level: 0 = none, 1 = some, 2 = lots
  verbosity(level, callback) {
    assert([ 0, 1, 2 ].indexOf(level) > -1, 'verbosity value options: 0 = none, 1 = some, 2 = lots!');
    this.callbacks.push({ id: this.req++, cmd: 'verbosity', fun: callback });
    this.connection.write(`verbosity ${level}${consts.terminated}`);
  }

  flushAllHandler() {
    const str = this.readline();
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    return {
      data: str === 'OK',
      meta: {
        body: str,
      },
    };
  }

  flushAll(time, callback) {
    this.callbacks.push({ id: this.req++, cmd: 'flushAll', fun: callback });
    this.connection.write(`flush_all ${time}${consts.terminated}`);
  }

  flush(time, callback) {
    this.flushAll(time, callback);
  }

  touchHandler() {
    const str = this.readline();
    debug('touch result: %s', str);
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    const result = {
      data: str === 'TOUCHED',
      meta: {
        body: str,
      },
    };
    return result;
  }

  // update the expiration time of an existing item without fetching it.
  touch(key, exptime, callback) {
    assert(!isNaN(exptime), 'Exptime is required');
    this.callbacks.push({ id: this.req++, cmd: 'touch', fun: callback });
    this.connection.write(`touch ${key} ${exptime} ${consts.noreply} ${consts.terminated}`);
  }

  incrHandler() {
    const str = this.readline();
    debug('crement result: %s', str);
    const err = this.errorHandler(str);
    if (err) {
      return err;
    }
    const result = {
      data: str === 'NOT_FOUND' ? false : Number(str),
      meta: {
        body: str,
      },
    };
    return result;
  }

  decrHandler() {
    return this.incrHandler();
  }

  increment(key, value, callback) {
    assert(!isNaN(value), 'The amount must be number');
    this.callbacks.push({ id: this.req++, cmd: 'incr', fun: callback });
    this.connection.write(`incr ${key} ${value} ${consts.noreply} ${consts.terminated}`);
  }

  decrement(key, value, callback) {
    assert(!isNaN(value), 'The amount must be number');
    this.callbacks.push({ id: this.req++, cmd: 'decr', fun: callback });
    this.connection.write(`decr ${key} ${value} ${consts.noreply} ${consts.terminated}`);
  }

  quit() {
    this.connection.write(`quit${consts.terminated}`);
    this.connection.end();
  }

  close() {
    this.quit();
  }

}

module.exports = Client;

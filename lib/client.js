/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

const debug = require('debug')('ocs:client');
const assert = require('assert');
const EventEmitter = require('events');
const net = require('net');
const is = require('is');
const Long = require('long');

const transcoder = require('./transcoder');
const methods = require('./methods');
const Command = require('./command');
const constant = require('./const');
const OPCODE = constant.opcode;
const STATUS = constant.status;

const TIMEOUT = 1000;

function valKey(k) {
  assert(k && is.string(k) || Buffer.isBuffer(k) && k.length, 'key must be a non-empty string or buffer');
}
function valValue(v) {
  assert(v !== null && v !== undefined && !is.function(v), 'value cannot be null or undefined or function');
}


/**
 * Aliyun OCS(open cache storage) client.
 * @see [binary protocol](https://cloud.github.com/downloads/memcached/memcached/protocol-binary.txt)
 */
class Client extends EventEmitter {
  constructor(options) {
    assert(options.host, 'options.host is required!');
    assert(options.port, 'options.port is required!');
    super();
    Object.assign(this, methods, options);
    this.pendings = [];
    this.callbacks = {};
    this.createConnection();
    Command.decodeFromStream(this.connection, (err, cmd) => {
      if (err) {
        return this.emit('error', err);
      }
      debug('get command', cmd);
      let opaque = cmd.opaque;
      if (cmd.status) {
        let err = new Error(`The server returns an error: ${STATUS[cmd.status]}`);
        err.code = cmd.status;
        this.callCallback(opaque, err, null);
      } else {
        let opcode = cmd.opcode;
        if (opcode === OPCODE.GET || opcode === OPCODE.GAT) {
          let flags = cmd.extras.readUInt32BE(0);
          transcoder.decode(flags, cmd.value, (err, v) => {
            this.callCallback(opaque, err, v);
          });
        } else if (opcode === OPCODE.INCREMENT || opcode === OPCODE.DECREMENT) {
          let buf = cmd.value;
          let long = new Long(buf.readUInt32BE(4), buf.readUInt32BE(0), true);
          this.callCallback(opaque, null, long);
        } else if (opcode === OPCODE.VERSION) {
          this.callCallback(opaque, null, cmd.value.toString());
        } else {
          this.callCallback(opaque, null, cmd.value);
        }
      }
    });
  }

  send(opcode, data, callback) {
    let lastArg = arguments[arguments.length - 1];
    if (is.function(lastArg)) {
      return this._send(opcode, data, callback);
    } else {
      return (cb) => {
        this._send(opcode, data, cb);
      };
    }
  }

  _send(opcode, data, callback) {
    if (this.ready || opcode === OPCODE.SASL_LIST_MECHS || opcode === OPCODE.SASL_AUTH) {
      if (is.function(data)) {
        callback = data;
        data = {};
      } else {
        data = data || {};
      }

      if ('key' in data) valKey(data.key);
      if ('value' in data) valValue(data.value);

      data.opcode = opcode;

      let cmd = new Command(data);
      this.callbacks[cmd.opaque] = {
        callback: callback,
        timer: setTimeout(() => {
          this.callCallback(cmd.opaque, new Error('Response timout'));
        }, TIMEOUT),
      };

      if (opcode === OPCODE.SET || opcode === OPCODE.ADD || opcode === OPCODE.REPLACE) {
        transcoder.encode(cmd.value, (err, flags, value) => {
          if (err) {
            debug('encode value error', err);
            this.callCallback(cmd.opaque, err, null);
          } else {
            cmd.extras.writeUInt32BE(flags, 0);
            cmd.value = value;
            debug('encode value ok, send command', cmd);
            this.connection.write(cmd.encode());
          }
        });
      } else {
        debug('send command', cmd);
        this.connection.write(cmd.encode());
      }

    } else {
      debug('cache command 0x%s', opcode.toString(16), data);
      this.pendings.push([opcode, data, callback]);
    }

    return this;
  }

  close() {
    this.closedByUser = true;
    this.send(OPCODE.QUIT, function(err) {
      if (err) {
        this.emit('error', err);
      }
    });
  }

  /**
   * @param {Error} err - when response status is not 0, reponse timeout or connection closed
   */
  callCallback(opaque, err, cmd) {
    if (opaque in this.callbacks) {
      let obj = this.callbacks[opaque];
      clearTimeout(obj.timer);
      obj.callback(err, cmd);
      delete this.callbacks[opaque];
    }
  }

  cleanupCallbacks(err) {
    for (let opaque in this.callbacks) {
      this.callCallback(opaque, err);
    }
  }

  createConnection() {
    let connection = this.connection = new net.Socket();

    connection.on('connect', () => {
      debug('connected');
      this.times = 0;
      if (this.username && this.password) {
        this.doAuth();
      } else {
        this.onReady();
      }
    });

    connection.on('error', err => {
      debug('connection error %j', err);
      // just record the error, close event follows
      this.lastError = err;
    });

    connection.on('close', () => {
      this.ready = false;
      if (this.closedByUser) {
        debug('connection closed by user');
        this.emit('close');
      } else {
        this.reconnect();
      }
    });

    this.connection.connect(this.port, this.host);
  }

  onReady() {
    debug('client is ready');
    this.ready = true;
    this.pendings.forEach((item) => {
      this.send(item[0], item[1], item[2]);
    });
    this.startHeartbeat();
  }

  onUnready() {
    debug('client is unready');
    this.ready = false;
    this.stopHeartbeat();
  }

  doAuth() {
    this.send(OPCODE.SASL_LIST_MECHS, (err) => {
      if (err) {
        return this.emit('error', err);
      }

      // v.toString() === 'PLAIN'
      // the only mechanisim aliyun ocs supports
      this.send(OPCODE.SASL_AUTH, {
        key: 'PLAIN',
        value: '\0' + this.username + '\0' + this.password,
      }, (err) => {
        if (err) {
          return this.emit('error'. err);
        }
        this.onReady();
      });
    });
  }

  reconnect() {
    this.times = this.times || 0;
    if (++this.times > 3) {
      debug('failed to reconnect for too many times, stop try to reconnect');
      this.emit('error', this.lastError);
      this.emit('close');

    } else {
      let timeout = this.times * 3 * 1000;
      debug('connection closed with error, try to reconnect for %d times in %d seconds', this.times, timeout / 1000);
      this.timer = setTimeout(() => {
        this.connection.connect(this.port, this.host);
      }, timeout);
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send(OPCODE.NO_OP, function() {});
    }, TIMEOUT);
  }

  stopHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    delete this.heartbeatTimer;
  }
}

module.exports = Client;

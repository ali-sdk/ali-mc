/**!
 * Copyright(c) ali-sdk and other contributors
 * MIT Licensed
 *
 * Authors:
 *   fool2fish <fool2fish@gmail.com> (https://github.com/fool2fish)
 */

'use strict';

const debug = require('debug')('mc:client');
const assert = require('assert');
const net = require('net');
const is = require('is');
const Long = require('long');
const Base = require('sdk-base');

const transcoder = require('./transcoder');
const methods = require('./methods');
const Command = require('./command');
const constant = require('./const');
const OPCODE = constant.opcode;
const STATUS = constant.status;

function valKey(k) {
  assert(k && is.string(k) || Buffer.isBuffer(k) && k.length, 'key must be a non-empty string or buffer');
}
function valValue(v) {
  assert(v !== null && v !== undefined && !is.function(v), 'value cannot be null or undefined or function');
}


/**
 * Aliyun Memcached client.
 * @see [binary protocol](https://cloud.github.com/downloads/memcached/memcached/protocol-binary.txt)
 */
class Client extends Base {
  constructor(options) {
    super();
    this.responseTimeout = 50;
    this.logger = console;
    Object.assign(this, methods, options);
    this.connected = false;
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
    if (is.function(data)) {
      callback = data;
      data = {};
    } else {
      data = data || {};
    }
    if (!this.connected) {
      return callback(new Error('The server is not available!'));
    }
    if ('key' in data) valKey(data.key);
    if ('value' in data) valValue(data.value);

    data.opcode = opcode;

    let cmd = new Command(data);
    this.callbacks[cmd.opaque] = {
      callback: callback,
      timer: setTimeout(() => {
        this.callCallback(cmd.opaque, new Error('Response timout'));
      }, this.responseTimeout),
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
    return this;
  }

  close() {
    if (!this.connected) {
      return;
    }
    this.closedByUser = true;
    this.send(OPCODE.QUIT, (err) => {
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
      this.connected = true;
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
      this.emit('error', err);
    });

    connection.on('close', () => {
      this.connected = false;
      if (this.closedByUser) {
        debug('connection closed by user');
      } else {
        this.reconnect();
      }
      this.emit('close');
    });

    this.connection.connect(this.port, this.host);
  }

  onReady() {
    this.logger.info('[mc] Client is ready!');
    this.ready(true);
    this.startHeartbeat();
  }

  onUnready() {
    this.logger.info('[mc] Client is unready!');
    this.ready(false);
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
    if (++this.times > 9999) {
      this.logger.error(new Error('Failed to reconnect for too many times, stop try to reconnect'));
      this.emit('error', this.lastError);
      this.emit('close');

    } else {
      let timeout = this.times * 2 * 1000;
      this.logger.warn('[mc] Connection closed with error, try to reconnect for %d times in %d seconds', this.times, timeout / 1000);
      this.timer = setTimeout(() => {
        this.connection.connect(this.port, this.host);
      }, timeout);
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send(OPCODE.NO_OP, function() {});
    }, this.responseTimeout);
  }

  stopHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    delete this.heartbeatTimer;
  }
}

module.exports = Client;

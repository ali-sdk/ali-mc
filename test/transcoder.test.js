'use strict';

const assert = require('assert');
const expect = require('expect.js');
const Long = require('long');
const io = require('java.io');
const is = require('is');
const InputObjectStream = io.InputObjectStream;
const OutputObjectStream = io.OutputObjectStream;

const transcoder = require('../lib/transcoder');
const encode = transcoder.encode;
const decode = transcoder.decode;

describe('transcoder', function() {
  it('string', function(done) {
    assertOk(done, 'i am a string', 0, new Buffer('i am a string'));
  });

  it('boolean', function(done) {
    assertOk(done, true, 1 << 8, new Buffer(1).fill(1));
  });

  it('int', function(done) {
    let o = 1234;
    let buf = new Buffer(4);
    buf.writeInt32BE(o);
    assertOk(done, o, 2 << 8, buf);
  });

  describe('long', function() {
    it('integer > 2^31-1 or < -2^31 should be treated as Long', function(done) {
      let o = Math.pow(2, 32);
      let l = Long.fromValue(o);
      let buf = new Buffer(8);
      buf.writeInt32BE(l.high, 0);
      buf.writeInt32BE(l.low, 4);
      assertOk(done, o, 3 << 8, buf);
    });

    it('should pass a instance of Long in', function(done) {
      let o = Long.fromValue(Math.pow(2, 32));
      let buf = new Buffer(8);
      buf.writeInt32BE(o.high, 0);
      buf.writeInt32BE(o.low, 4);
      assertOk(done, o, 3 << 8, buf);
    });
  });

  it('double', function(done) {
    let o = 3.14;
    let buf = new Buffer(8);
    buf.writeDoubleBE(o);
    assertOk(done, o, 7 << 8, buf);
  });

  it('date', function(done) {
    let o = new Date();
    let l = Long.fromValue(o.getTime());
    let buf = new Buffer(8);
    buf.writeInt32BE(l.high, 0);
    buf.writeInt32BE(l.low, 4);
    assertOk(done, o, 4 << 8, buf);
  });

  it('buffer', function(done) {
    let o = new Buffer('buffer from string');
    assertOk(done, o, 8 << 8, o);
  });

  it('should transcode by java.io when pass a java object in', function(done) {
    let o = { '$':
      { isValid: true,
        clientId: 'some-clientId',
        dataId: 'some-dataId',
        groups:
         { '$': { size: 2, capacity: 10 },
           '$class':
            { name: 'java.util.ArrayList',
              serialVersionUID: '8683452581122892189',
              flags: 3,
              fields: [ { type: 'I', name: 'size' } ],
              superClass: null },
           '_$': [ 'SOFA-GROUP', 'HSF' ] },
        hostId: '127.0.0.1',
        serverIP: '127.0.0.2' },
     '$class':
      { name: 'javaio.test.PureClientInfo',
        serialVersionUID: '-4839365452784671213',
        flags: 2,
        fields:
         [ { type: 'Z', name: 'isValid' },
           { type: 'L', name: 'clientId', classname: 'Ljava/lang/String;' },
           { type: 'L', name: 'dataId', classname: 'Ljava/lang/String;' },
           { type: 'L', name: 'groups', classname: 'Ljava/util/List;' },
           { type: 'L', name: 'hostId', classname: 'Ljava/lang/String;' },
           { type: 'L', name: 'serverIP', classname: 'Ljava/lang/String;' } ],
        superClass: null } };
    let buf = OutputObjectStream.writeObject(o);
    let so = InputObjectStream.readObject(buf);
    encode(o, function(_err, _flags, _buf) {
      assert.equal(_flags, 1);
      decode(_flags, _buf, function(_err, _o) {
        expect(_o).to.eql(so);
        done();
      });
    });
  });

  it.skip('should compress big data', function(/* done */) {

  });
});


function assertOk(done, o, flags) {
  encode(o, function(_err, _flags, _buf) {
    assert.equal(flags, _flags);
    decode(_flags, _buf, function(_err, _o) {
      if (Long.isLong(_o)) {
        assert(_o.equals(o));
      } else if (is.date(_o)) {
        assert.equal(o.getTime(), _o.getTime());
      } else if (Buffer.isBuffer(_o)) {
        assert.equal(Buffer.compare(o, _o), 0);
      } else {
        assert.equal(o, _o);
      }
      done();
    });
  });
}

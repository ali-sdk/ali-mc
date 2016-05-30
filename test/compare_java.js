'use strict';

const memcached = require('../');
const config = require('./fixtures/config');
const co = require('co');

co(function*() {

  let mc = memcached.createClient(config);

  const value1 = yield mc.get('key1');
  console.log('key1: ', value1);

  const value2 = yield mc.get('key2');
  console.log('key2: ', value2);

  const value3 = yield mc.get('key3');
  console.log('key3: ', value3);

}).then(function() {
  process.exit(0);
});

// key1:  tangyao
// key2:  { int: 2147483647, boolean: true, long: '9223372036854775807' }
// key3:  { cars: [ { id: 1, color: '#ffffff;' } ],
//   desc: '这是备注 this is what?',
//   id: 678001,
//   name: '中文名' }


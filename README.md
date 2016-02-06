# ali-ocs
Aliyun OCS(open cache storage) client.
A standard implemetation of memcached binary protocol,
and is compatible with spymemcached-2.12.0.jar.


[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![coverage][cov-image]][cov-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/ali-ocs.svg?style=flat-square
[npm-url]: https://npmjs.org/package/ali-ocs
[travis-image]: https://img.shields.io/travis/ali-sdk/ali-ocs.svg?style=flat-square
[travis-url]: https://travis-ci.org/ali-sdk/ali-ocs
[cov-image]: http://codecov.io/github/ali-sdk/ali-ocs/coverage.svg?branch=master
[cov-url]: http://codecov.io/github/ali-sdk/ali-ocs?branch=master
[david-image]: https://img.shields.io/david/ali-sdk/ali-ocs.svg?style=flat-square
[david-url]: https://david-dm.org/ali-sdk/ali-ocs

## Install

```
npm install ali-ocs --save
```

## Usage

- [new OCSClient(options)](#new-ocsclientoptions)
- [.get(key[, callback])](#getkey-callback)
- [.set(key, value[, expired, callback])](#setkey-value-expired-callback)
- [.add(key, value[, expired, callback])](#addkey-value-expired-callback)
- [.replace(key, value[, expired, callback])](#replacekey-value-expired-callback)
- [.delete(key[, callback])](#deletekey-callback)
- [.increment(key[, step, callback])](#incrementkey-step-callback)
- [.decrement(key[, step, callback])](#decrementkey-step-callback)
- [.flush([expired, callback])](#flushexpired-callback)
- [.version([callback])](#versioncallback)
- [.append(key, value[, callback])](#appendkey-value-callback)
- [.prepend(key, value[, callback])](#prependkey-value-callback)
- [.touch(key[, expired, callback])](#touchkey-expired-callback)
- [.gat(key[, expired, callback])](#gatkey-expired-callback)
- [.close()](#close)
- [Event: 'error'](#event-error)
- [Event: 'close'](#event-close)

### new OCSClient(options)

Create a OCS client instance.

Parameters:

- {object} options
  - {String} host
  - {Integer} port
  - {String} [username]
  - {String} [password]

Example:

```
const OCSClient = require('ali-ocs');
const ocs = new OCSClient({
  host: ${host},
  port: ${port},
  username: ${username},
  password: ${password},
})
```

### .get(key[, callback])

Get the item with specified key.

Parameters:

- {String} key
- {function(err, value)} [callback]

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.

Example:

```
// call with callback
ocs.get(${someKey}, function(err, value) {
  if (err) {
    return console.log(err);
  }
  console(value);
});

// call without callback
const co = require('co');
co(function *() {
  try {
    let value = yield ocs.get(${someKey});
    console.log(value);
  } catch(err) {
    console.log(err);
  }
});
```

### .set(key, value[, expired, callback])
### .add(key, value[, expired, callback])
### .replace(key, value[, expired, callback])

Set should store the data unconditionally if the item exists or not.
Add MUST fail if the item already exist.
Replace MUST fail if the item doesn't exist.

Parameters:

- {String} key
- {object} value - anything except for function, null and undefined
- {UnsignedInteger} [expired = 0] - in seconds
- {function(err)} [callback]

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.


### .delete(key[, callback])

Delete the item with specified key.

Parameters:

- {String} key
- {function(err)} [callback]

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.


### .increment(key[, step, callback])
### .decrement(key[, step, callback])

Add or remove the specified amount to the requested counter.

Increment will cause the counter to wrap if it is up to the max value of 64 bit unsigned int.

Decrement will never result in a "negative value" (or cause the counter to "wrap")

Parameters:

- {String} key
- {PostiveInteger|UnsignedLong|object} [step = 1] - amount to add or remove. An object could be passed in to specify more details:
  - {UnsignedInteger|UnsignedLong} [step = 1]
  - {UnsignedInteger|UnsignedLong} [initial = 1] - initial value
  - {UnsignedInteger} [expired = 0] - in seconds
- {function(err, value)} [callback] - the returned value is an instance of unsigned Long. If the item doesn't exist, the server will respond with the initial value.

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.

Example:

```
ocs.increment(${someKey}, function(err, value) { ... });

// above is equal to
ocs.increment(${someKey}, 1, function(err, value) { ... });

// also is equal to
ocs.increment(${someKey}, {
  step: 1,
}, function(err, value) { ... });
```

### .flush([expired, callback])

Flush the items in the cache now or some time in the future as
specified by the "expired" field.

Parameters:

- {UnsignedInteger} [expired = 0] - in seconds
- {function(err)} [callback]

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.


### .version([callback])

Request the server version.

Parameters:

- {function(err, value)} [callback] - the value is a version string

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.

### .append(key, value[, callback])
### .prepend(key, value[, callback])

Append or prepend the specified value to
   the requested key.

Parameters:

- {String} key
- {String|Buffer} value
- {function(err)} [callback]

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.

Example:

```
// appends "!" to the "Hello" key
ocs.append('Hello', '!', function(err) { ... });
```

### .touch(key[, expired, callback])

Change the item's expiration.

Parameters:

- {String} key
- {UnsignedInteger} [expired = 0] - in seconds
- {function(err)} [callback]

Return:

- {ocs|thunk} returns the ocs instance if the callback is passed in, or return the thunk.

### .gat(key[, expired, callback])

All the same with `.touch()` except this it will return the value of the spcified key.

### .close()

Close the client, you should listen the 'close' event to confirm that the client closes.

### Event: 'error'

Emitted when an error occurs.

Parameters:

- {Error} err - error object

### Event: 'close'

Emitted when the client closes.

## References

- [memcached.org](http://memcached.org/)
- [memecached binary protocol](https://cloud.github.com/downloads/memcached/memcached/protocol-binary.txt)

---

The MIT License (MIT)
Copyright (c) 2016 fool2fish <fool2fish@gmail.com> and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
var server = require('../lib/server')
const cuid = require('cuid')
var { saveData, getDataById } = require('../lib/redisFunction')

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Should get empty data when no data is inserted', function (t) {
  var url = '/targets/get'

  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body, [], 'reponse is empty array')
    t.end()
  })
})

test.serial.cb('Should get data after data is inserted in db', function (t) {
  var url = '/targets/get'
  const payload = {
    url: 'http://example.com',
    value: '0.70',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }

  // Generate unique id.
  const id = cuid()
  saveData(`target:${id}`, JSON.stringify({ id, ...payload })).then(() => {
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      const expected = [{ id, ...payload }]
      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(res.body, expected, 'Targets count greater than 0')
      t.end()
    })
  })
})

test.serial.cb('Should get data after data is inserted in db with query param', function (t) {
  var url = '/targets/get?hour=18&&geoState=la'
  const payload = {
    url: 'http://example.com',
    value: '0.70',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['la']
      },
      hour: {
        $in: ['18']
      }
    }
  }

  // Generate unique id.
  const id = cuid()
  saveData(`target:${id}`, JSON.stringify({ id, ...payload })).then(() => {
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      const responseCountGreaterThanOne = res.body.length > 0
      const expected = true
      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(responseCountGreaterThanOne, expected, 'Targets count greater than 0')
      t.end()
    })
  })
})

test.serial.cb('Should post target with URL, Value and maxAcceptsPerDay', function (t) {
  var url = '/targets/put'
  var val = {
    url: 'http://example.com',
    value: '0.70',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }

  servertest(server(), url, { method: 'POST', encoding: 'json' }, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    const response = res.body
    const expected = { id: response.id, ...val }
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(response, expected, 'Response matched')
    t.end()
  }
})

test.serial.cb('Should throw error when url, value and maxAcceptsPerDay is not provided', function (t) {
  var url = '/targets/put'
  var val = { }

  servertest(server(), url, { method: 'POST', encoding: 'json' }, onResponse)
    .end(JSON.stringify(val))

  const error = { hasError: true, message: { url: 'Url cannot be null', value: 'Value cannot be null', maxAcceptsPerDay: 'maxAcceptsPerDay cannot be null' } }

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    const response = res.body
    t.is(res.statusCode, 400, 'correct statusCode')
    t.deepEqual(response, error, 'Response matched')
    t.end()
  }
})

test.serial.cb('Should get 404 Error when id is not found', function (t) {
  var url = '/targets/get/1'

  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    const expected = {
      message: 'Target not found'
    }
    t.is(res.statusCode, 404, 'correct statusCode')
    t.deepEqual(res.body, expected, 'Target not found')
    t.end()
  })
})

test.serial.cb('Should get target when valid id is given', function (t) {
  var url = '/targets/get/2'
  const payload = {
    url: 'http://example.com',
    value: '0.70',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }

  // Generate unique id.
  const id = 2
  saveData(`target:${id}`, JSON.stringify({ id, ...payload })).then(() => {
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      const expected = { id, ...payload }
      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(res.body, expected, 'Target fetched by id')
      t.end()
    })
  })
})

test.serial.cb('Should update target with URL, Value and maxAcceptsPerDay', function (t) {
  var url = '/targets/put/2'
  var val = {
    url: 'http://example.com',
    value: '1.70',
    maxAcceptsPerDay: '12',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }

  servertest(server(), url, { method: 'POST', encoding: 'json' }, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    const response = res.body
    const expected = { id: response.id, ...val }
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(response, expected, 'Response matched')
    t.end()
  }
})

test.serial.cb('Should throw error bad request when url, value and maxAcceptsPerDay is not provided', function (t) {
  var url = '/targets/put/2'
  var val = { }

  servertest(server(), url, { method: 'POST', encoding: 'json' }, onResponse)
    .end(JSON.stringify(val))
  const error = { hasError: true, message: { url: 'Url cannot be null', value: 'Value cannot be null', maxAcceptsPerDay: 'maxAcceptsPerDay cannot be null' } }

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    const response = res.body
    t.is(res.statusCode, 400, 'correct statusCode')
    t.deepEqual(response, error, 'Response matched')
    t.end()
  }
})

test.serial.cb('Should be able to save in redis', function (t) {
  const expected = 'OK'
  const payload = { id: 213, data: 'random data' }

  saveData('key', JSON.stringify(payload)).then(data => {
    t.is(data, expected, 'Data Saved')
    t.end()
  })
})

test.serial.cb('Should throw error when payload is not given', function (t) {
  const expected = 'key or value is missing'

  saveData().catch(err => {
    t.is(err.message, expected, 'Error key value missing')
    t.end()
  })
})

test.serial.cb('Should throw error when value is not JSON', function (t) {
  const expected = 'value must be valid JSON'

  saveData('key', 'invalid json').catch(err => {
    t.is(err.message, expected, 'Error not valid JSON value')
    t.end()
  })
})

test.serial.cb('Should get data by id from redis', function (t) {
  const payload = { id: 213, data: 'random data' }

  saveData('key', JSON.stringify(payload)).then(() => {
    getDataById('key').then(res => {
      t.deepEqual(res, payload, 'data fetched')
      t.end()
    })
  })
})

test.serial.cb('Should give null new key not found', function (t) {
  getDataById('randomKey').then(res => {
    t.is(res, null, 'No data')
    t.end()
  })
})

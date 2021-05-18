process.env.NODE_ENV = 'test'

const test = require('ava')
const servertest = require('servertest')
const server = require('../lib/server')
const cuid = require('cuid')
const { saveData } = require('../lib/redisFunction')
const { getFormattedDate } = require('../lib/util/time')

test.serial.cb('healthcheck', function (t) {
  const url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Should get empty data when no data is inserted', function (t) {
  const url = '/api/targets/get'

  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body, [], 'reponse is empty array')
    t.end()
  })
})

test.serial.cb('Should get data after data is inserted in db', function (t) {
  const url = '/api/targets/get'
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

test.serial.cb(
  'Should get data after data is inserted in db with query param',
  function (t) {
    const url = '/api/targets/get?hour=18&&geoState=la'
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
        t.is(
          responseCountGreaterThanOne,
          expected,
          'Targets count greater than 0'
        )
        t.end()
      })
    })
  }
)

test.serial.cb(
  'Should post target with URL, Value and maxAcceptsPerDay',
  function (t) {
    const url = '/api/targets/put'
    const val = {
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

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      const expected = { id: response.id, ...val }
      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(response, expected, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb(
  'Should throw error when url, value, maxAcceptsPerDay, geoState and hour is not provided',
  function (t) {
    const url = '/api/targets/put'
    const val = {}

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))

    const error = {
      hasError: true,
      message: {
        url: 'Url cannot be null',
        value: 'Value cannot be null',
        maxAcceptsPerDay: 'maxAcceptsPerDay cannot be null',
        geoState: 'accept.geoState.$in cannot be null',
        hour: 'accept.hour.$in cannot be null'
      }
    }

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      t.is(res.statusCode, 400, 'correct statusCode')
      t.deepEqual(response, error, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb(
  'Should throw error when geoState and hour is not array',
  function (t) {
    const url = '/api/targets/put'
    const val = {
      url: 'http://example.com',
      value: '0.70',
      maxAcceptsPerDay: '10',
      accept: {
        geoState: {
          $in: 'String'
        },
        hour: {
          $in: 'String'
        }
      }
    }

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))

    const error = {
      hasError: true,
      message: {
        geoState: 'accept.geoState.$in must be a array',
        hour: 'accept.hour.$in must be a array'
      }
    }

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      t.is(res.statusCode, 400, 'correct statusCode')
      t.deepEqual(response, error, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb('Should get 404 Error when id is not found', function (t) {
  const url = '/api/target/get/1'

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
  const url = '/api/target/get/2'
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

test.serial.cb(
  'Should update target with URL, Value and maxAcceptsPerDay',
  function (t) {
    const url = '/api/target/put/2'
    const val = {
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

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      const expected = { id: response.id, ...val }
      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(response, expected, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb(
  'Should throw error bad request when url, value, maxAcceptsPerDay, geoState and hour is not provided while updating target',
  function (t) {
    const url = '/api/target/put/2'
    const val = {}

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))
    const error = {
      hasError: true,
      message: {
        url: 'Url cannot be null',
        value: 'Value cannot be null',
        maxAcceptsPerDay: 'maxAcceptsPerDay cannot be null',
        geoState: 'accept.geoState.$in cannot be null',
        hour: 'accept.hour.$in cannot be null'
      }
    }

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      t.is(res.statusCode, 400, 'correct statusCode')
      t.deepEqual(response, error, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb(
  'Should throw error bad request when geoState and hour is not array while updating target',
  function (t) {
    const url = '/api/target/put/2'
    const val = {
      url: 'http://example.com',
      value: '1.70',
      maxAcceptsPerDay: '12',
      accept: {
        geoState: {
          $in: 'String'
        },
        hour: {
          $in: 'String'
        }
      }
    }

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))
    const error = {
      hasError: true,
      message: {
        geoState: 'accept.geoState.$in must be a array',
        hour: 'accept.hour.$in must be a array'
      }
    }

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      t.is(res.statusCode, 400, 'correct statusCode')
      t.deepEqual(response, error, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb(
  'Should throw error bad request when geoState and timestamp is not provided',
  function (t) {
    const url = '/route/put'
    const val = {}

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))
    const error = {
      hasError: true,
      message: {
        geoState: 'geoState cannot be null',
        timestamp: 'timestamp cannot be null'
      }
    }

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      t.is(res.statusCode, 400, 'correct statusCode')
      t.deepEqual(response, error, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb(
  'Should throw error bad request when todays timestamp is not provided',
  function (t) {
    const url = '/route/put'
    const val = { geoState: 'ca', timestamp: '2021-05-16T14:19:58Z' }

    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))
    const error = {
      hasError: true,
      message: { timestamp: 'timestamp must be todays date' }
    }

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      t.is(res.statusCode, 400, 'correct statusCode')
      t.deepEqual(response, error, 'Response matched')
      t.end()
    }
  }
)

test.serial.cb('Should give rejection when maxCount is reached', function (t) {
  const url = '/route/put'
  const val = { geoState: 'ca', timestamp: new Date().toISOString() }

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
    },
    count: {
      date: getFormattedDate(new Date(), 'yyyy-MM-dd'),
      value: 10
    }
  }

  // Generate unique id.
  const id = cuid()
  saveData(`target:${id}`, JSON.stringify({ id, ...payload })).then(() => {
    servertest(
      server(),
      url,
      { method: 'POST', encoding: 'json' },
      onResponse
    ).end(JSON.stringify(val))
    const expected = { decision: 'reject' }

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      const response = res.body
      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(response, expected, 'Response matched')
      t.end()
    }
  })
})

test.serial.cb(
  'Should give another url when maxCount is reached for one',
  function (t) {
    const url = '/route/put'
    const val = { geoState: 'tx', timestamp: new Date().toISOString() }

    const payload1 = {
      url: 'http://example1.com',
      value: '0.70',
      maxAcceptsPerDay: '10',
      accept: {
        geoState: {
          $in: ['tx']
        },
        hour: {
          $in: [
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '10',
            '11',
            '12',
            '13',
            '14',
            '15',
            '16',
            '17',
            '18',
            '19',
            '20',
            '21',
            '22',
            '23',
            '24'
          ]
        }
      },
      count: {
        date: getFormattedDate(new Date(), 'yyyy-MM-dd'),
        value: 10
      }
    }

    const payload2 = {
      url: 'http://example2.com',
      value: '0.20',
      maxAcceptsPerDay: '10',
      accept: {
        geoState: {
          $in: ['tx']
        },
        hour: {
          $in: [
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '10',
            '11',
            '12',
            '13',
            '14',
            '15',
            '16',
            '17',
            '18',
            '19',
            '20',
            '21',
            '22',
            '23',
            '24'
          ]
        }
      },
      count: {
        date: getFormattedDate(new Date(), 'yyyy-MM-dd'),
        value: 5
      }
    }

    // Generate unique id.
    const id = cuid()
    const id2 = cuid()
    saveData(`target:${id}`, JSON.stringify({ id, ...payload1 })).then(() => {
      saveData(`target:${id2}`, JSON.stringify({ id2, ...payload2 })).then(
        () => {
          servertest(
            server(),
            url,
            { method: 'POST', encoding: 'json' },
            onResponse
          ).end(JSON.stringify(val))
          const expected = { url: 'http://example2.com' }

          function onResponse (err, res) {
            t.falsy(err, 'no error')
            const response = res.body
            t.is(res.statusCode, 200, 'correct statusCode')
            t.deepEqual(response, expected, 'Response matched')
            t.end()
          }
        }
      )
    })
  }
)

test.serial.cb('Should give url with high value', function (t) {
  const url = '/route/put'
  const val = { geoState: 'dc', timestamp: new Date().toISOString() }

  const payload2 = {
    url: 'http://example1.com',
    value: '0.70',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['dc']
      },
      hour: {
        $in: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
          '13',
          '14',
          '15',
          '16',
          '17',
          '18',
          '19',
          '20',
          '21',
          '22',
          '23',
          '24'
        ]
      }
    },
    count: {
      date: getFormattedDate(new Date(), 'yyyy-MM-dd'),
      value: 3
    }
  }

  const payload1 = {
    url: 'http://example2.com',
    value: '0.20',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['dc']
      },
      hour: {
        $in: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
          '13',
          '14',
          '15',
          '16',
          '17',
          '18',
          '19',
          '20',
          '21',
          '22',
          '23',
          '24'
        ]
      }
    },
    count: {
      date: getFormattedDate(new Date(), 'yyyy-MM-dd'),
      value: 5
    }
  }

  // Generate unique id.
  const id1 = cuid()
  const id2 = cuid()
  saveData(`target:${id1}`, JSON.stringify({ id: id1, ...payload1 })).then(
    () => {
      saveData(`target:${id2}`, JSON.stringify({ id: id2, ...payload2 })).then(
        () => {
          servertest(
            server(),
            url,
            { method: 'POST', encoding: 'json' },
            onResponse
          ).end(JSON.stringify(val))
          const expected = { url: 'http://example1.com' }

          function onResponse (err, res) {
            t.falsy(err, 'no error')
            const response = res.body
            t.is(res.statusCode, 200, 'correct statusCode')
            t.deepEqual(response, expected, 'Response matched')
            t.end()
          }
        }
      )
    }
  )
})

test.serial.cb('Should give url with high value for first time', function (t) {
  const url = '/route/put'
  const val = { geoState: 'sa', timestamp: new Date().toISOString() }

  const payload1 = {
    url: 'http://example4.com',
    value: '0.70',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['sa']
      },
      hour: {
        $in: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
          '13',
          '14',
          '15',
          '16',
          '17',
          '18',
          '19',
          '20',
          '21',
          '22',
          '23',
          '24'
        ]
      }
    }
  }

  // Generate unique id.
  const id1 = cuid()
  saveData(`target:${id1}`, JSON.stringify({ id: id1, ...payload1 })).then(
    () => {
      servertest(
        server(),
        url,
        { method: 'POST', encoding: 'json' },
        onResponse
      ).end(JSON.stringify(val))
      const expected = { url: 'http://example4.com' }

      function onResponse (err, res) {
        t.falsy(err, 'no error')
        const response = res.body
        t.is(res.statusCode, 200, 'correct statusCode')
        t.deepEqual(response, expected, 'Response matched')
        t.end()
      }
    }
  )
})

test.serial.cb(
  'Should give url with high value even though count is reached for max for previous day',
  function (t) {
    const url = '/route/put'
    const val = { geoState: 'test', timestamp: new Date().toISOString() }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.toISOString()

    const payload1 = {
      url: 'http://example5.com',
      value: '0.70',
      maxAcceptsPerDay: '10',
      accept: {
        geoState: {
          $in: ['test']
        },
        hour: {
          $in: [
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '10',
            '11',
            '12',
            '13',
            '14',
            '15',
            '16',
            '17',
            '18',
            '19',
            '20',
            '21',
            '22',
            '23',
            '24'
          ]
        }
      },
      count: {
        date: getFormattedDate(yesterday, 'yyyy-MM-dd'),
        value: 10
      }
    }

    // Generate unique id.
    const id1 = cuid()
    saveData(`target:${id1}`, JSON.stringify({ id: id1, ...payload1 })).then(
      () => {
        servertest(
          server(),
          url,
          { method: 'POST', encoding: 'json' },
          onResponse
        ).end(JSON.stringify(val))
        const expected = { url: 'http://example5.com' }

        function onResponse (err, res) {
          t.falsy(err, 'no error')
          const response = res.body
          t.is(res.statusCode, 200, 'correct statusCode')
          t.deepEqual(response, expected, 'Response matched')
          t.end()
        }
      }
    )
  }
)

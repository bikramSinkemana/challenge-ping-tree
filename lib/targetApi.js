const send = require('send-data/json')
const body = require('body/json')
const cuid = require('cuid')
const validator = require('./requestValidator')
const { getAllData, getDataById, saveData } = require('./redisFunction')

async function getTargets (req, res, opts, cb) {
  const { query } = opts
  const targetsFromDb = await getAllData('target:*')
  const targets = targetsFromDb.map(target=>{
    return {
      ...target,
      count: undefined,
    }
  })

  let filteredGeoStateTargets = [...targets]

  // Filter the target by geoState;
  if (query.geoState) {
    filteredGeoStateTargets = filteredGeoStateTargets.filter((target) => {
      return (
        target &&
        target.accept &&
        target.accept.geoState &&
        target.accept.geoState.$in &&
        target.accept.geoState.$in.includes(query.getState)
      )
    })
  }

  console.log(`filteredGeoStateTargets`, filteredGeoStateTargets)
  // Filter the target by hour;
  if (query.hour) {
    console.log('query', query)

    filteredGeoStateTargets = filteredGeoStateTargets.filter((target) => {
      return (
        target &&
        target.accept &&
        target.accept.hour &&
        target.accept.hour.$in &&
        target.accept.hour.$in.includes(query.hour)
      )
    })
  }

  return send(req, res, filteredGeoStateTargets)
}

function postTarget (req, res, opts, cb) {
  body(req, res, async function (err, data) {
    if (err) return cb(err)

    // Validate if url, value and maxAcceptsPerDay are present or not. JOI validation can be used.
    const error = validator.validatePostTarget(data)
    if (error.hasError) {
      res.statusCode = 400
      return send(req, res, error)
    }

    // Generate unique id.
    const id = cuid()
    await saveData(`target:${id}`, JSON.stringify({ id, ...data }))

    return send(req, res, { id, ...data })
  })
}

async function getTargetById (req, res, opts, cb) {
  const target = await getDataById(`target:${opts.params.id}`)
  if (!target) {
    res.statusCode = 404
    return send(req, res, { message: 'Target not found' })
  }

  return send(req, res, target)
}

async function updateTargetById (req, res, opts, cb) {
  body(req, res, async function (err, data) {
    if (err) return cb(err)

    const { id } = opts.params

    const target = await getDataById(`target:${id}`)

    let payload = {}

    if(!target) payload = { id, ...data }
    if(target) payload = { ...target, ...data}

    // validate if url, value and maxAcceptsPerDay are present or not. JOI validation can be used.
    const error = validator.validatePostTarget(data)
    if (error.hasError) {
      res.statusCode = 400
      return send(req, res, error)
    }

    await saveData(`target:${id}`, JSON.stringify({...payload, count: undefined}))

    return send(req, res, payload)
  })
}

module.exports = {
  getTargets,
  postTarget,
  getTargetById,
  updateTargetById
}

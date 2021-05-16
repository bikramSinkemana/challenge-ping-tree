const send = require('send-data/json')
const body = require('body/json')
const dateFnsTz = require('date-fns-tz')
const { compareAsc } = require('date-fns')
const validator = require('./requestValidator')
const { getAllData, saveData } = require('./redisFunction')

async function getDecision (req, res, opts, cb) {
  body(req, res, async function (err, data) {
    if (err) return cb(err)

    // Validate if url, value and maxAcceptsPerDay are present or not. JOI validation can be used.
    const error = validator.validatePostRoute(data)
    if (error.hasError) {
      res.statusCode = 400
      return send(req, res, error)
    }

    // Fetch all targets.
    const targets = await getAllData('target:*')

    // Sorting targets by value.
    targets.sort((a, b) => {
      return a.value - b.value
    })

    let filteredGeoStateTargets = [...targets]

    // Filter the target by geoState;
    if (data.getState) {
      filteredGeoStateTargets = targets.filter((target) => {
        return (
          target &&
          target.accept &&
          target.accept.geoState &&
          target.accept.geoState.$in &&
          target.accept.geoState.$in.includes(data.getState)
        )
      })
    }

    // Filter the target by time;
    if (data.timestamp) {
      const hourFromTimeStamp = getFormattedDate(data.timestamp, 'H')

      filteredGeoStateTargets = targets.filter((target) => {
        return (
          target &&
          target.accept &&
          target.accept.hour &&
          target.accept.hour.$in &&
          target.accept.hour.$in.includes(hourFromTimeStamp)
        )
      })
    }

    let elementToUpdate = null
    let i = 0
    while (!elementToUpdate && i !== filteredGeoStateTargets.length) {
      const element = filteredGeoStateTargets[i]

      const formattedDateOfToday = getFormattedDate(new Date(), 'yyyy-MM-dd')

      // If count is not present newly added targets.
      if (!element.count) {
        elementToUpdate = {
          ...element,
          count: {
            date: formattedDateOfToday,
            value: 1
          }
        }
      }

      let dateComparison = null
      if (element.count) {
        const formattedDateFromTarget = element.count.date
        dateComparison = compareAsc(new Date(formattedDateFromTarget), new Date(formattedDateOfToday))
      }

      // First request for the day.
      if (element.count && dateComparison === -1) {
        elementToUpdate = {
          ...element,
          count: {
            date: formattedDateOfToday,
            value: 1
          }
        }
      }

      // If targets max request is not reached.
      if (element.count && (dateComparison === 0 || dateComparison === 1) && element.count.value < element.maxAcceptsPerDay) {
        elementToUpdate = {
          ...element,
          count: {
            date: formattedDateOfToday,
            value: element.count.value + 1
          }
        }
      }

      i++
    }

    if (elementToUpdate) {
      await saveData(`target:${elementToUpdate.id}`, JSON.stringify(elementToUpdate))

      return send(req, res, { url: elementToUpdate.url })
    }

    return send(req, res, { decision: 'reject' })
  })
}

module.exports = {
  getDecision
}

const getFormattedDate = (date, format) => {
  return dateFnsTz.format(
    dateFnsTz.utcToZonedTime(date),
    format
  )
}
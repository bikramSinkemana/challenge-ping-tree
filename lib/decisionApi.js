const send = require('send-data/json')
const body = require('body/json')
const { compareAsc } = require('date-fns')
const validator = require('./requestValidator')
const { getAllData, saveData } = require('./redisFunction')
const { getFormattedDate } = require('./util/time')
const { filterTargetByGeoState, filterTargetByTimeStamp } = require('./util/targets')

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
      return b.value - a.value
    })

    let filteredGeoStateTargets = [...targets]
    let filteredGeoStateHourTargets = [...targets]

    // Filter the target by geoState;
    if (data.geoState) {
      filteredGeoStateTargets = filterTargetByGeoState(targets, data.geoState)
      filteredGeoStateHourTargets = [...filteredGeoStateTargets]
    }

    // Filter the target by time;
    if (data.timestamp) {
      const hourFromTimeStamp = getFormattedDate(data.timestamp, 'H')
      filteredGeoStateHourTargets = filterTargetByTimeStamp(targets, hourFromTimeStamp)
    }

    const decidedTarget = getDeciedTargetByCountAndMaxAcceptPerDay(filteredGeoStateHourTargets, null)

    if (decidedTarget) {
      await saveData(`target:${decidedTarget.id}`, JSON.stringify(decidedTarget))

      return send(req, res, { url: decidedTarget.url })
    }

    return send(req, res, { decision: 'reject' })
  })
}

module.exports = {
  getDecision
}

const getDeciedTargetByCountAndMaxAcceptPerDay = (targets, decidedTarget) => {
  let i = 0
  while (!decidedTarget && i !== targets.length) {
    let dateComparison = null
    const target = targets[i]
    const formattedDateOfToday = getFormattedDate(new Date(), 'yyyy-MM-dd')
    const hasTargetNeverBeenSelected = !target.count

    if (!hasTargetNeverBeenSelected) {
      const formattedDateFromTarget = target.count.date
      dateComparison = compareAsc(new Date(formattedDateFromTarget), new Date(formattedDateOfToday))
    }

    const hasTargetBeenSelectedForPreviousDays = target.count && dateComparison === -1
    const beenSelectedForTodayAndNotReachedMaxDay = target.count &&
      (dateComparison === 0 || dateComparison === 1) &&
      target.count.value < target.maxAcceptsPerDay

    // If count is not present newly added target. i.e. target hasn't been selected till now.
    if (hasTargetNeverBeenSelected) {
      decidedTarget = {
        ...target,
        count: { date: formattedDateOfToday, value: 1 }
      }
    }

    // First request for the day.
    if (hasTargetBeenSelectedForPreviousDays) {
      decidedTarget = {
        ...target,
        count: { date: formattedDateOfToday, value: 1 }
      }
    }

    // If targets max request is not reached.
    if (beenSelectedForTodayAndNotReachedMaxDay) {
      decidedTarget = {
        ...target,
        count: { date: formattedDateOfToday, value: target.count.value + 1 }
      }
    }

    i++
  }

  return decidedTarget
}

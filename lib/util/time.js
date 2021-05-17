
const dateFnsTz = require('date-fns-tz')

const getFormattedDate = (date, format) => {
  return dateFnsTz.format(
    dateFnsTz.utcToZonedTime(date),
    format
  )
}

module.exports = {
  getFormattedDate
}

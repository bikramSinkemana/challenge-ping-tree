const { isToday } = require('date-fns')

const validatePostTarget = (requestBody) => {
  const geoState = requestBody.accept && requestBody.accept.geoState && requestBody.accept.geoState.$in
  const hour = requestBody.accept && requestBody.accept.hour && requestBody.accept.hour.$in
  const error = { hasError: false, message: {} }

  if (!requestBody.url) {
    error.hasError = true
    error.message.url = 'Url cannot be null'
  }

  if (!requestBody.value) {
    error.hasError = true
    error.message.value = 'Value cannot be null'
  }

  if (!requestBody.maxAcceptsPerDay) {
    error.hasError = true
    error.message.maxAcceptsPerDay = 'maxAcceptsPerDay cannot be null'
  }

  if (!requestBody.maxAcceptsPerDay) {
    error.hasError = true
    error.message.maxAcceptsPerDay = 'maxAcceptsPerDay cannot be null'
  }

  if (!geoState) {
    error.hasError = true
    error.message.geoState = 'accept.geoState.$in cannot be null'
  }

  if (geoState && !Array.isArray(geoState)) {
    error.hasError = true
    error.message.geoState = 'accept.geoState.$in must be a array'
  }

  if (!(hour)) {
    error.hasError = true
    error.message.hour = 'accept.hour.$in cannot be null'
  }

  if (hour && !Array.isArray(hour)) {
    error.hasError = true
    error.message.hour = 'accept.hour.$in must be a array'
  }

  return error
}

const validatePostRoute = (requestBody) => {
  const error = { hasError: false, message: {} }
  if (!requestBody.geoState) {
    error.hasError = true
    error.message.geoState = 'geoState cannot be null'
  }

  if (!requestBody.timestamp) {
    error.hasError = true
    error.message.timestamp = 'timestamp cannot be null'
  }

  if (requestBody.timestamp && !isToday(new Date(requestBody.timestamp))) {
    error.hasError = true
    error.message.timestamp = 'timestamp must be todays date'
  }

  return error
}

module.exports = {
  validatePostTarget,
  validatePostRoute
}

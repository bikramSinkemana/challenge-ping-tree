const filterTargetByGeoState = (targets, geoState) => {
  return targets.filter((target) => {
    return (
      target &&
      target.accept &&
      target.accept.geoState &&
      target.accept.geoState.$in &&
      target.accept.geoState.$in.includes(geoState)
    )
  })
}

const filterTargetByTimeStamp = (targets, timestamp) => {
  return targets.filter((target) => {
    return (
      target &&
      target.accept &&
      target.accept.hour &&
      target.accept.hour.$in &&
      target.accept.hour.$in.includes(timestamp)
    )
  })
}

module.exports = {
  filterTargetByGeoState,
  filterTargetByTimeStamp
}

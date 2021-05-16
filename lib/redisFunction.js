const client = require('./redis')

// Save data
const saveData = (key, value) => {
  return new Promise((resolve, reject) => {
    if (!key || !value) {
      reject(new Error('key or value is missing'))
    }

    try {
      JSON.parse(value)
    } catch (e) {
      reject(new Error('value must be valid JSON'))
    }

    client.set(key, value, function (err, res) {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

// Get data by key
const getDataById = (key) => {
  return new Promise((resolve, reject) => {
    client.get(key, function (err, res) {
      if (err) reject(err)
      else resolve(JSON.parse(res))
    })
  })
}

// Get all data
const getAllData = (keyField) => {
  return new Promise((resolve, reject) => {
    const redisValues = []

    // get list of keys.
    client.keys(keyField, function (err, keys) {
      if (err) reject(err)
      if (keys) {
        const promises = []
        keys.forEach(async (key, cb) => {
          promises.push(getDataById(key))
        })

        // get all the data for given keys.
        Promise.all(promises).then((targets) => {
          resolve(targets)
        })
      }

      if (!keys) {
        resolve(redisValues)
      }
    })
  })
}

module.exports = {
  saveData,
  getDataById,
  getAllData
}

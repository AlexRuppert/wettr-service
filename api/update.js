const { Pool } = require('pg')
const format = require('pg-format')
const { allowCors } = require('../lib/serverless')
const { askPassphrase } = require('./../lib/utils')
const { getTimes, getBlob, getTimesToUpdate } = require('./../lib/data')
const { getClouds } = require('./../lib/clouds')

const pool = new Pool({
  connectionString: process.env.DB_CONNECTION,
})

async function cleanupTable() {
  return pool.query(
    `DELETE FROM clouds WHERE "time" < NOW() - INTERVAL '16 min'`
  )
}
async function getDbTimes() {
  return pool.query(`SELECT DISTINCT "time" FROM clouds`)
}
async function insertClouds(timestamp, clouds) {
  const query = format(
    'INSERT INTO clouds ("time", lon_bucket, lat_bucket, "data") VALUES %L',
    clouds.map(c => [timestamp, ...Object.values(c)])
  )
  return pool.query(query)
}

module.exports = allowCors(async (req, res) => {
  await askPassphrase(req, res, async () => {
    const getDbTimesPromise = getDbTimes()
    cleanupTable()
    const times = getTimes()
    const timesToUpdate = await getTimesToUpdate(times, await getDbTimesPromise)

    const timeAndBuffer = timesToUpdate.map(({ name, time }) => ({
      time,
      buffer: getBlob(name),
    }))

    const result = await Promise.all(
      timeAndBuffer.map(async t =>
        insertClouds(t.time, getClouds(await t.buffer))
      )
    )
    res.json({
      result: result.reduce((acc, val) => acc + val.rowCount, 0),
    })
  })
})

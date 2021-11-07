const format = require('pg-format')
const { allowCors, getPool } = require('../lib/serverless')
const { askPassphrase } = require('./../lib/utils')
const { getTimes, getBlob, getTimesToUpdate } = require('./../lib/data')
const { getClouds } = require('./../lib/clouds')

const pool = getPool()

async function cleanupTable() {
  return pool.query(
    `DELETE FROM clouds WHERE "time" < NOW() - INTERVAL '16 min'`
  )
}
async function insertClouds(timestamp, clouds) {
  const query = format(
    'INSERT INTO clouds ("time", lon_bucket, lat_bucket, "data") VALUES %L',
    clouds.map(c => [timestamp, ...Object.values(c)])
  )
  return pool.query(query)
}

module.exports = allowCors(async (req, res) => {
  //await askPassphrase(req, res, async () => {
    cleanupTable()
    const times = getTimes()
    const timesToUpdate = times

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
      times: timesToUpdate.map(t => t.time),
      result: result.reduce((acc, val) => acc + val.rowCount, 0),
    })
  //})
})

const { allowCors, getPool } = require('../lib/serverless')
const { askPassphrase } = require('./../lib/utils')

const pool = getPool()

async function initTable() {
  const query = `
CREATE TABLE IF NOT EXISTS clouds (
  time timestamptz,
  lon_bucket int,
  lat_bucket int,
  data text
);`
  return pool.query(query)
}

module.exports = allowCors(async (req, res) => {
  await askPassphrase(req, res, async () => {
    res.json({
      result: (await initTable())?.command ?? 'error',
    })
  })
})

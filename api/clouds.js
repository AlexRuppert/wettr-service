const { allowCors, getPool } = require('../lib/serverless')

const pool = getPool()

async function queryClouds(bounds, onlyNow = false) {
  const coordinates = bounds.split(',').map(num => num | 0)
  const query = `
SELECT * FROM clouds
WHERE lon_bucket >= $1 AND lon_bucket <= $2 AND lat_bucket >= $3 AND lat_bucket <= $4 ${
    onlyNow
      ? `AND "time" >= NOW() - INTERVAL '16 min' AND "time" <= NOW() + INTERVAL '16 min'`
      : ''
  }
`
  return pool.query(query, coordinates)
}
module.exports = allowCors(async (req, res) => {
  res.json(
    (await queryClouds(req.query.bounds, req.query?.onlyNow ?? false)).rows
  )
})

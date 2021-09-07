const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,PATCH,DELETE,POST,PUT'
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  req.headers = getHeaders(req.rawHeaders)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  return await fn(req, res)
}

const getHeaders = rawHeaders =>
  Object.fromEntries(
    rawHeaders.reduce((acc, val, i) => {
      i % 2 === 0 ? acc.push([val]) : acc[(i - 1) / 2].push(val)
      return acc
    }, [])
  )
module.exports = { allowCors }

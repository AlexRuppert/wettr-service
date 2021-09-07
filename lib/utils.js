const PI_PER_180 = Math.PI / 180
const R = 6370.04
const M_NUMERATOR = 1 + Math.sin(deg2rad(60))
const INV_POL_NUMERATOR = R * R * M_NUMERATOR * M_NUMERATOR
function deg2rad(val) {
  return val * PI_PER_180
}
function rad2deg(val) {
  return val / PI_PER_180
}

function polProj({ lon, lat }) {
  const latRad = deg2rad(lat)
  const lonRad0 = deg2rad(lon - 10)
  const M = M_NUMERATOR / (1 + Math.sin(latRad))
  const temp1 = R * M * Math.cos(latRad)
  const x = temp1 * Math.sin(lonRad0)
  const y = -temp1 * Math.cos(lonRad0)
  return { x, y }
}

function invPolProj({ x, y }) {
  const lon = rad2deg(Math.atan(-x / y)) + 10
  const temp2 = x * x + y * y
  const lat = rad2deg(
    Math.asin((INV_POL_NUMERATOR - temp2) / (INV_POL_NUMERATOR + temp2))
  )
  return { lon, lat }
}

const round2 = num => (num * 100 + 0.5) << 0

function compareConstantString(a, b) {
  //simple "constant-time-quality-check" password comparison
  const LENGTH = 25
  const [a1, b1] = [a, b].map(el => el.padEnd(LENGTH, '0'))
  let equal = true
  for (let i = 0; i < a1.length; i++) {
    if (a1 !== b1) equal = false
  }
  return equal
}

async function askPassphrase(req, res, fn) {
  if (
    compareConstantString(
      req?.headers?.passphrase ?? '',
      process.env.PASSPHRASE
    )
  ) {
    await fn()
  } else {
    res.status(401).end()
  }
}
module.exports = {
  round2,
  polProj,
  invPolProj,
  compareConstantString,
  askPassphrase,
}

const { invPolProj, polProj, round2 } = require('./utils')
const pako = require('pako')
const pointInPolygon = require('point-in-polygon')

//rough shape of germany to filter out irrelevant clouds
const polygon = [
  [10.17, 47.24],
  [7.31, 47.49],
  [7.77, 48.92],
  [6.36, 49.15],
  [5.82, 51.03],
  [5.89, 51.92],
  [7.12, 53.23],
  [6.6, 53.59],
  [8.25, 53.9],
  [8.34, 55.13],
  [11.8, 54.44],
  [13.43, 54.72],
  [14.28, 53.94],
  [15.17, 50.91],
  [12.37, 50.14],
  [14.03, 48.67],
  [13.22, 47.42],
  [10.19, 47.25],
]

const bounds = {
  lb: {
    lon: 3.5889,
    lat: 46.9526,
  },
  rt: {
    lon: 15.7208,
    lat: 54.7405,
  },
}
const offsetGrid = polProj(bounds.lb)

function getDataBlock(lon, lat, value) {
  return [round2(lon), round2(lat), round2(value)]
}
function encodeCloudData(clouds) {
  const result = []

  clouds.forEach((value, key) => {
    let elements = value

    let matrix = new Uint8Array(100 * 100)

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      matrix[element[1] * 100 + element[0]] = element[2]
    }

    let zeros = 0
    let index = 0
    const putZeros = () => {
      matrix[index++] = 128 | zeros
      zeros = 0
    }
    for (let i = 0; i < matrix.length; i++) {
      const m = matrix[i]
      if (m === 0) {
        zeros++
        if (zeros >= 127) {
          putZeros()
        }
      } else {
        if (zeros >= 1) {
          putZeros()
        }
        matrix[index++] = m
      }
    }
    putZeros()

    data = Buffer.from(
      pako.deflate(matrix.subarray(0, index), {
        strategy: 0,
        windowBits: 8,
      })
    ).toString('base64')
    const s = [key >> 8, key & 255]
    result.push({ lon: s[0], lat: s[1], data })
  })
  return result
}

function getCloudTuples(buffer, width = 900) {
  buffer = buffer.slice(buffer.indexOf(3) + 1)
  const buff = new DataView(buffer.buffer)
  const clouds = new Map()

  for (let i = 0; i < buffer.length / 2; i++) {
    const bytes = buff.getUint16(i * 2)
    if (bytes & 32768) continue
    let value = bytes & 4095
    if (value <= 65) continue
    value = (value / 2 - 32.5) / 2015
    const column = i % width
    const row = (i / width) | 0
    const x = offsetGrid.x + column
    const y = offsetGrid.y + row
    const { lon, lat } = invPolProj({ x, y })

    if (!pointInPolygon([lon, lat], polygon)) continue

    const lonFloor = lon | 0
    const latFloor = lat | 0
    const key = (lonFloor << 8) | latFloor
    if (!clouds.has(key)) {
      clouds.set(key, [])
    }

    clouds.get(key).push(getDataBlock(lon - lonFloor, lat - latFloor, value))
  }

  return clouds
}

function getClouds(buffer) {
  const clouds = getCloudTuples(buffer)
  const result = encodeCloudData(clouds)
  return result
}

module.exports = { getClouds }

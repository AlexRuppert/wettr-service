const fetch = require('node-fetch')
const pako = require('pako')
const DWD_RADVOR_RQ_URL = 'https://opendata.dwd.de/weather/radar/radvor/rq/'

async function getBlob(name) {
  const fileName = 'RQ' + name + '.gz'
  const blob = await (await fetch(DWD_RADVOR_RQ_URL + fileName)).blob()
  const buffer = pako.inflate(new Uint8Array(await blob.arrayBuffer()))

  return buffer
}

const pad = (num, length) => ('' + num).padStart(length, '0')

function formatTime(baseTime, targetTime) {
  const [YY, MM, DD, HH, mm] = [
    'FullYear',
    'Month',
    'Date',
    'Hours',
    'Minutes',
  ].map(section =>
    ['UTC', ''].map(zone =>
      zone === 'UTC'
        ? baseTime['get' + zone + section]()
        : targetTime['get' + zone + section]()
    )
  )

  ;[utc, actualTime] = [0, 1].map(el =>
    [YY[el], MM[el] + 1, DD[el], HH[el], mm[el] - (mm[el] % 15)].map(el =>
      pad(el, 2)
    )
  )

  return {
    formatted: [utc[0].substr(2), ...utc.slice(1)].join(''),
    time: new Date(
      `${actualTime.slice(0, 3).join('-')}T${actualTime.slice(3).join(':')}`
    ),
  }
}

function getTimeOffset(now, querterHours) {
  const MINUTES_15 = 15 * 60 * 1000
  return new Date(now.getTime() + MINUTES_15 * querterHours)
}
function getTimes() {
  const MINUTES_5 = 5 * 60 * 1000
  const now = new Date(Date.now() - MINUTES_5) //server does not update immediately
  return [...Array(9)]
    .map((e, i) => [i % 4, (2 - ((i / 4) | 0)) * 4])
    .map(([offset, lookahead]) => {
      const formatted = formatTime(
        getTimeOffset(now, -offset),
        getTimeOffset(now, -offset + lookahead)
      )
      return {
        name: formatted.formatted + '_' + pad(lookahead * 15, 3),
        time: formatted.time,
      }
    })
}

async function getTimesToUpdate(times, getDbTimes) {
  const dbTimes = getDbTimes.rows.map(t => new Date(t.time))
  return times.filter(
    t => !dbTimes.some(db => db.getTime() === t.time.getTime())
  )
}
module.exports = {
  getTimes,
  getTimesToUpdate,
  getBlob,
}

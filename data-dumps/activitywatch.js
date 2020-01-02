const moment = require('moment')
const fetch = require('node-fetch')
const fs = require('fs')

const {
  error,
  log,
} = console

const {
  AUTHORIZATION,
  DATA_DUMP_PATH,
} = process.env

const CURRENT_DATE = moment().format()

const BASE_URL = `https://activitywatch.maddie.today`

;(async () => {
  try {
    log(`getting buckets to dump`)

    const bucketsResponse = await fetch(`${BASE_URL}/api/v1/buckets`, {
      headers: {
        [`Authorization`]: `Bearer ${AUTHORIZATION}`,
      },
    })

    const { buckets } = await bucketsResponse.json()

    log(`got buckets to dump: ${buckets.join(`, `)}`)

    const eventDumpPromises = buckets.map(async (bucketName) => {
      log(`dumping ${bucketName}`)
      const eventResponse = await fetch(`${BASE_URL}/api/v1/get/${bucketName}`, {
        headers: {
          [`Authorization`]: `Bearer ${AUTHORIZATION}`,
        },
      })

      const events = await eventResponse.json()

      log(`got ${events.length} events to dump`)
      return fs.writeFile(`${DATA_DUMP_PATH}/aw-${bucketName}-${CURRENT_DATE}`, JSON.stringify(events))
    })

    log(`waiting for event dumps to complete`)
    await Promise.allSettled(eventDumpPromises)

    process.exit(0)
  } catch (error) {
    error(`got error while dumping:`, error)

    process.exit(1)
  }
})()

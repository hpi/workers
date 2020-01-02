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

const services = [
  `trello`,
  `jmap`,
  `todoist`,
  `plaid`,
]

log(`grabbing events`)

;(async () => {
  try {
    const dumpPromises = services.map(async (service) => {
      log(`grabbing ${service}`)

      const response = await fetch(`https://${service}.qnzl.now.sh/api/pull`, {
        headers: {
          [`Authorization`]: `Bearer ${AUTHORIZATION}`,
        }
      })

      const dump = await response.json()

      log(`got service dump for ${service}`)

      return fs.writeFile(`${DATA_DUMP_PATH}/${service}-${CURRENT_DATE}`, JSON.stringify(dump))
    })

    await Promise.allSettled(dumpPromises)

    process.exit(0)
  } catch (error) {
    error(`got error while dumping non-oauth services:`, error)

    process.exit(1)
  }
})()


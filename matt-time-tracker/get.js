const moment = require('moment-timezone')
const fetch = require('node-fetch')
const fs = require('fs/promises')

const {
  TO_PHONE_NUMBER,
  JWT_TOKEN
} = process.env

;(async () => {
  const currentDate = moment().tz(`America/New_York`).startOf(`day`).format()

  const to = PERSONAL_PHONE_NUMBER
  const from = `+19083565835`

  console.log(`finding work messages from today`)
  const res = await fetch(`https://messaging.qnzl.vercel.app/api/history/sms?to=${to}&from=${from}&date=${currentDate}`, {
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`
    }
  })

  const THREAD_ID = `8c9823b535c7cc134bade07dcf79f81b`

  const threads = await res.json()
  const thread = threads[THREAD_ID]

  const filteredMessages = thread.filter((message) => {
    return message.from === to
  })

  if (filteredMessages.length > 0) {
    const startOfWeek = moment().startOf('week')
    await fs.writeFile(`${moment().format('YYYY-MM-DD')}.json`, JSON.stringify(todayTimespan))
  }
})()

const Sendgrid = require('@sendgrid/mail')
const moment = require('moment-timezone')
const fetch = require('node-fetch')
const fs = require('fs/promises')

const {
  FROM_PHONE_NUMBER,
  SENDGRID_API_KEY,
  TO_PHONE_NUMBER,
  JWT_TOKEN
} = process.env

Sendgrid.setApiKey(SENDGRID_API_KEY)

;(async () => {
  const currentDate = moment().tz(`America/New_York`).startOf(`day`).format()

  const from = FROM_PHONE_NUMBER
  const to = `+19083565835`

  console.log(`finding work messages from today`)
  const res = await fetch(`https://messaging.vercel.app/api/history/sms?to=${to}&from=${from}&date=${currentDate}`, {
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`
    }
  })

  const THREAD_ID = `7b606bbf3dd275e07f79ee75080b7b07`

  const threads = await res.json()
  const threadMessages = threads[THREAD_ID].messages

  if (!threadMessages) return

  const filteredMessages = threadMessages.filter((message) => {
    return message.from === from
  })

  if (filteredMessages.length > 0) {
    console.log(`reading ${threadMessages.length} messages`)
    let timespanIndex = 0

    const todayTimespan = filteredMessages.reduce((timespans, message) => {
      const formattedMsg = message.body.toLowerCase()

      if (formattedMsg === 'no' || formattedMsg === 'skip') {
        timespans = [ 'out' ]

        return timespans
      }

      const [ hour, minute ] = formattedMsg.split(':')

      if (!hour && !minute) {
        return timespans
      }

      let am = false
      if (minute && minute.includes('a')) {
        am = true
      }

      if (minute) {
        minute = minute.replace('p', '').replace('pm', '').replace('a', '').replace('am', '')
      }

      const time = moment()
        .hour(am ? hour : Number(hour) + 12)
        .minute(minute || 0)
        .format()

      timespans[timespanIndex].push(time)

      if (timespans[timespanIndex].length >= 2) {
        timespans.push([])

        timespanIndex++
      }

      return timespans
    }, [[]])

    await fs.writeFile(`${moment().format('YYYY-MM-DD')}.json`, JSON.stringify(todayTimespan))

    const weekStart = moment().startOf('week')
    const daysToFind = []

    for (
      let day = moment().startOf('week');
      day.dayOfYear() <= moment().dayOfYear();
      day.add(1, 'day')
    ) {
      daysToFind.push(day.format('YYYY-MM-DD'))
    }

    const parsedTimespanPromises = daysToFind.map(async (date) => {
      let file

      try {
        file = await fs.readFile(`${date}.json`, 'utf8')
      } catch (e) {
        return
      }

      return JSON.parse(file)
    })

    let parsedTimespans = await Promise.all(parsedTimespanPromises)
    parsedTimespans = parsedTimespans.filter(Boolean)

    const totalHours = parsedTimespans.reduce((runningTotal, timespans) => {
      return runningTotal += timespans.reduce((dailyTotal, [ start, end ]) => {
        return dailyTotal += moment(end).diff(moment(start), 'hours')
      }, 0)
    }, 0)

    Sendgrid.send({
      to: 'robots@maddie.today',
      from: 'robots@maddie.today',
      subject: `Time tracking for week of ${weekStart.format('MMM Do, YYYY')}, as of ${moment().format('MMM Do, YYYY')}`,
      text: `${totalHours} hours worked`,
    })
  }
})()

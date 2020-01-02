const moment = require(`moment-timezone`)
const fetch = require(`node-fetch`)

const {
  PERSONAL_PHONE_NUMBER,
  EXISTIO_TOKEN,
  JWT_TOKEN
} = process.env

;(async () => {
  const currentDate = moment().tz(`America/New_York`).startOf(`day`).format()

  const to = PERSONAL_PHONE_NUMBER
  const from = `+19083565835`

  console.log(`finding mood messages from today`)
  const res = await fetch(`https://messaging.qnzl.vercel.app/api/history/sms?to=${to}&from=${from}&date=${currentDate}`, {
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`
    }
  })

  const THREAD_ID = `10f9df8a421a080ea383bdf12890d282`

  const threads = await res.json()
  const thread = threads[THREAD_ID]

  let average = 5
  const messages = []

  const filteredMessages = thread.filter((message) => {
    return message.from === to
  })

  if (filteredMessages.length > 0) {

    console.log(`finding average from ${thread.length} messages`)
    const totalScore = filteredMessages.reduce((total, message) => {
      const numRegex = /[0-9]+/g
      const wordRegex = /([A-z]+(\s|$))+/g

      const [ score ] = message.body.match(numRegex)
      const [ _message ] = message.body.match(wordRegex)

      messages.push(_message)

      return total + Number(score)
    }, 0)

    average = Math.round(totalScore / filteredMessages.length)
  }

  console.log(`setting mood to ${average}`)
  await fetch(`https://existio.qnzl.now.sh/api/attributes/update`, {
    method: `POST`,
    body: JSON.stringify({
      name: `mood`,
      value: average,
      date: moment().format(`YYYY-MM-DD`)
    }),
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
      'x-exist-access-token': EXISTIO_TOKEN,
      'Content-Type': `application/json`
    }
  })

  await fetch(`https://existio.qnzl.now.sh/api/attributes/update`, {
    method: `POST`,
    body: JSON.stringify({
      name: `mood_note`,
      value: messages.join(`,`),
      date: moment().format(`YYYY-MM-DD`)
    }),
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
      'x-exist-access-token': EXISTIO_TOKEN,
      'Content-Type': `application/json`
    }
  })

  console.log(`set mood`)
})()

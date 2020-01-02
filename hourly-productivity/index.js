const moment = require(`moment`)
const fetch = require(`node-fetch`)

const {
  AW_URL: awUrl,
  GRAPH_URL: graphUrl,
  EXISTIO_URL: existIOUrl,
  GRAPH_AUTHORIZATION,
  EXIST_AUTHORIZATION
} = process.env

const findBucketType = (uncleanBucketName) => {
  const splitBucket = uncleanBucketName.split(`-`)

  // aw-watcher-[bucketName]_[computer name]
  const [ bucketName, computerName ] = splitBucket[2].split(`_`)

  return bucketName
}

const relevantDate = moment().subtract(1, `day`).startOf(`day`).format(`YYYY-MM-DD`)
const endOfRelevantDate = moment().subtract(1, `day`).endOf(`day`).format(`YYYY-MM-DD`)

const getQuery = `
{
  activityWatch {
    window: bucket(id:"window") {
      id
      activity(date:"${relevantDate}") {
        id
        duration
        timestamp
        data {
          app
          title
          status
          url
          audible
          tabCount
          productivity
        }
      }
    }
    web: bucket(id:"web") {
      id
      activity(date:"${relevantDate}") {
        id
        duration
        timestamp
        data {
          app
          title
          status
          url
          audible
          tabCount
          productivity
        }
      }
    }
  }
}
`

;(async () => {
  // Send in the graph request as a POST request
  // This might be premature optimization since I believe
  // the request limit is only applied to the query and not the response
  const graphRes = await fetch(`${graphUrl}/graphql`, {
    method: `POST`,
    body: JSON.stringify({
      query: getQuery
    }),
    headers: {
      Authorization: `Bearer ${GRAPH_AUTHORIZATION}`,
      'Content-Type': `application/json`
    }
  })

  const { data: { activityWatch } } = await graphRes.json()

  const { window: _window, web } = activityWatch

  const bucketEvents = [ _window, web ]

  // Tally up all of the categorized time across all of the buckets
  const timeCategorizations = bucketEvents.reduce((totalTimes, { activity }) => {
    const watcherTime = (activity || []).reduce((times, { duration, data: { productivity } }) => {
      times[productivity] += duration || 0

      return times
    }, { productive: 0, distracting: 0, neutral: 0, gaming: 0, tv: 0, mobile_screen: 0 })

    totalTimes.productive += watcherTime.productive || 0
    totalTimes.distracting += watcherTime.distracting || 0
    totalTimes.neutral += watcherTime.neutral || 0
    totalTimes.gaming += watcherTime.gaming || 0
    totalTimes.tv += watcherTime.tv || 0
    totalTimes.mobile_screen += watcherTime.mobile_screen || 0

    return totalTimes
  }, { productive: 0, distracting: 0, neutral: 0, gaming: 0, tv: 0, mobile_screen: 0 })


  const updates = Object.keys(timeCategorizations).map((key) => {
    const body = {
      name: `${key}_min`,
      value: Math.floor(timeCategorizations[key] / 60),
      date: moment(relevantDate).format(`YYYY-MM-DD`)
    }

    return body
  })

  // TODO Use the GraphQL mutation
  // TODO Send multiple at a time
  const res = await fetch(`${existIOUrl}/api/1/attributes/update/`, {
    method: `POST`,
    body: JSON.stringify(updates),
    headers: {
      Authorization: `Bearer ${EXIST_AUTHORIZATION}`,
      'Content-Type': `application/json`
    }
  })

  console.log(await res.text())
})()



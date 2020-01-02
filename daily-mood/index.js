const moment = require(`moment`)
const fetch = require(`node-fetch`)

const {
  GRAPH_AUTHORIZATION,
  EXIST_AUTHORIZATION
} = process.env

;(async () => {
  if (!GRAPH_AUTHORIZATION) {
    console.log(`Could not find graph authorization`)
  }

  const currentDate = moment().format(`YYYY-MM-DD`)
  console.log(`checking for mood note for ${currentDate}`)

  const attrRes = await fetch(`https://graph.maddie.today/graphql?query={existio {attribute(name:"mood", date:"${currentDate}") {date value}}}`, {
    method: `GET`,
    headers: {
      Authorization: `Bearer ${GRAPH_AUTHORIZATION}`,
      'existAccessToken': EXIST_AUTHORIZATION
    }
  })

  const { data: { existio: { attribute } } } = await attrRes.json()

  const todaysValue = attribute[0].value

  console.log(`todays value is ${todaysValue}`)
  if (todaysValue !== null) {
    console.log(`aborting mood note update due to pre-existing value`)
    return process.exit(0)
  }

  console.log(`updating mood note with default "3"`)
  const res = await fetch(`https://graph.maddie.today/graphql`, {
    method: `POST`,
    body: JSON.stringify({
      query: `mutation{updateAttribute(name:"mood", value:"3", date:"${currentDate}"){failure{name value} success{name value}}}`
    }),
    headers: {
      'Content-Type': `application/json`,
      Authorization: `Bearer ${GRAPH_AUTHORIZATION}`,
      'existAccessToken': EXIST_AUTHORIZATION
    }
  })

  const {
    data: {
      updateAttribute: {
        success
      }
    }
  } = await res.json()

  if (success.length > 0) {
    console.log(`successfully updated attribute 'mood' to '3'`)

    return process.exit(0)
  }

  console.log(`failed to update attribute`)

  process.exit(1)
})()

const moment = require(`moment`)
const fetch = require(`node-fetch`)

const removeLabels = (content) => {
  const [ task, ...labels ] = content.split(`@`)

  return task.trim().split(` `).map((word) => word[0].toUpperCase() + word.slice(1)).join(``)
}

const {
  GRAPH_URL,
  EXISTIO_URL,
  GRAPH_AUTHORIZATION,
  TODOIST_AUTHORIZATION,
  EXIST_AUTHORIZATION,
} = process.env

;(async () => {
  const previousDay = moment().subtract(1, `day`)
  const previousDate = previousDay.format(`YYYY-MM-DD`)
  const startOfPrevDay = moment(previousDay).startOf(`day`).format()
  const endOfPrevDay = moment(previousDay).endOf(`day`).format()

  // `<x>:` is for labeling return values
  const query = `{
    todoist {
      selfcare: completed(projectId:"2226228388", since:"${startOfPrevDay}", until:"${endOfPrevDay}") {
        content
      }
      cleaning: completed(projectId:"2226227349", since:"${startOfPrevDay}", until:"${endOfPrevDay}") {
        content
      }
      organization: completed(projectId:"2226228533", since:"${startOfPrevDay}", until:"${endOfPrevDay}") {
        content
      }
    }
  }`

  const res = await fetch(`${GRAPH_URL}/graphql?query=${query}`, {
    method: `GET`,
    headers: {
      Authorization: `Bearer ${GRAPH_AUTHORIZATION}`,
      'todoistAccessToken': TODOIST_AUTHORIZATION
    }
  })

  const { data: { todoist } } = await res.json()

  Object.keys(todoist).forEach((area) => {
    if (!todoist[area]) return

    todoist[area] = todoist[area]
      .map(({ content }) => removeLabels(content))
      .reduce((activities, task) => {
        if (activities[task]) {
          activities[task]++
        } else {
          activities[task] = 1
        }

        return activities
      }, {})
  })

  const completedTasks = Object.assign({}, ...Object.values(todoist))

  const update = Object.keys(completedTasks).map((taskKey) => {
    const taskCount = completedTasks[taskKey]

    const taskValue = taskCount > 1 ? `${taskCount}x ${taskKey}` : taskKey

    return { value: taskValue, date: previousDate }
  })

  const url = `${EXISTIO_URL}/api/1/attributes/custom/append/`

  const updateRes = await fetch(url, {
    method: `POST`,
    headers: {
      Authorization: `Bearer ${EXIST_AUTHORIZATION}`,
      'Content-Type': `application/json`
    },
    body: JSON.stringify(update)
  })

  console.log(await updateRes.text())
})()



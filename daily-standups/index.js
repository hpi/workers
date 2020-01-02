const fetch = require(`node-fetch`)

const getLineForTask = (task) => {
  return `_ ${task.content}`
}

const {
  GRAPH_AUTHORIZATION
} = process.env

;(async () => {
  const res = await fetch(`http://localhost:4000/graphql?query={todoist{tasksToday(projectId:"2226226883"){content priority comments{content} due}}}`, {
    method: `GET`,
    headers: {
      Authorization: `Bearer ${GRAPH_AUTHORIZATION}`
    }
  })

  const { data } = await res.json()

  const { todoist } = data
  let { tasksToday } = todoist

  let refIndex = 0
  const taskReferences = []

  tasksToday = tasksToday.sort((a, b) => {
    return b.priority - a.priority
  })

  const standupLines = tasksToday.map((task) => {
    let line = getLineForTask(task)

    if (task.comments.length > 0) {
      line += ` [${refIndex++}]`

      const references = task.comments.map(({ content }) => content)

      taskReferences.push(references.join(`\n\n`))
    }

    return line
  })

  const standup = `Listed in priority order:\n${standupLines.join(`\n`)}`

  const referenceLines = taskReferences.map((taskRef, index) => {
    return `[${index}]: ${taskRef}\n`
  })

  const references = referenceLines.join(`\n`)

  console.log(standup)
  console.log(`--\n--`)
  console.log(references)
})()


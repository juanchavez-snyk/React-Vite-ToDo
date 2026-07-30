import ICAL from 'ical.js'

// Feature: export the todo list as an .ics file so it can be pulled into a
// calendar app.
//
// DEMO LICENSE ISSUE (Snyk Open Source): ical.js is MPL-2.0, a weak-copyleft
// license. Snyk's license policy scores MPL-2.0 as medium, because shipping it
// carries source-disclosure obligations for modified files.
export function todosToIcs(todos) {
  const calendar = new ICAL.Component(['vcalendar', [], []])
  calendar.updatePropertyWithValue('prodid', '-//Snyk Demo//Todo//EN')
  calendar.updatePropertyWithValue('version', '2.0')

  todos.forEach((todo) => {
    const item = new ICAL.Component('vtodo')
    item.updatePropertyWithValue('uid', `todo-${todo.id}@snyk-demo`)
    item.updatePropertyWithValue('summary', todo.title)
    item.updatePropertyWithValue('status', todo.done ? 'COMPLETED' : 'NEEDS-ACTION')

    if (todo.notes) {
      item.updatePropertyWithValue('description', todo.notes)
    }

    calendar.addSubcomponent(item)
  })

  return calendar.toString()
}

export function downloadIcs(todos) {
  const blob = new Blob([todosToIcs(todos)], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'todos.ics'
  link.click()

  URL.revokeObjectURL(url)
}

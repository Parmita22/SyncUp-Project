export function getDueDateStatus(dueDate) {
  const today = new Date()
  const dueDateObj = new Date(dueDate)
  today.setHours(0, 0, 0, 0)
  dueDateObj.setHours(0, 0, 0, 0)

  const timeDiff = dueDateObj.getTime() - today.getTime()

  if (timeDiff === 0) {
    return "today"
  }
  if (timeDiff === 86400000) {
    return "tomorrow"
  }
  return "other"
}

"use server"

import prisma from "@/src/lib/prisma"

const fetchNotifications = async (email) => {
  const notifications = await prisma.notification.findMany({
    where: {
      users: {
        some: {
          email,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return notifications.map((notification) => ({
    ...notification,
    new: notification.status === "UNREAD",
  }))
}

const markNotificationAsRead = async (notificationId) => {
  try {
    await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        status: "READ",
      },
    })
  } catch (error) {
    throw new Error("Error marking notification as read.")
  }
}

const saveNotificationPreferences = async (email, preferences) => {
  try {
    const updatedPreferences = {
      ...preferences,
      Board: true,
    }
    await prisma.user.update({
      where: { email },
      data: { notificationPreferences: updatedPreferences },
    })
  } catch (error) {
    throw new Error("Error saving notification preferences.")
  }
}
const fetchNotificationPreferences = async (email) => {
  if (!email)
    throw new Error("No email provided to fetchNotificationPreferences")

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { notificationPreferences: true },
    })
    return user?.notificationPreferences || {}
  } catch (error) {
    throw new Error("Error fetching notification preferences.")
  }
}
const fetchActivityLogs = async (cardId) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
    })
    return activities
  } catch (error) {
    throw new Error("Failed to fetch activity logs.")
  }
}
export {
  fetchNotifications,
  markNotificationAsRead,
  saveNotificationPreferences,
  fetchNotificationPreferences,
  fetchActivityLogs,
}

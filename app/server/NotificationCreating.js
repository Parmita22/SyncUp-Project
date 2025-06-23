"use server"

import prisma from "@/src/lib/prisma"

const createNotification = async (author, event, details, userIds) => {
  try {
    await prisma.Notification.create({
      data: {
        author,
        event,
        details,
        users: {
          connect: userIds.map((userId) => ({ id: parseInt(userId, 10) })),
        },
      },
    })
    return true
  } catch (error) {
    return error
  }
}

export default createNotification

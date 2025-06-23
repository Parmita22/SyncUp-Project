"use server"

import prisma from "@/src/lib/prisma"
import { logActivity } from "./task"
import { NotificationEventConstants } from "@/src/components/notification/eventMapper"
import { showErrorToast } from "@/src/utils/toastUtils"

export const createAttachment = async ({
  updateId,
  path,
  name,
  authorName,
}) => {
  try {
    const attachment = await prisma.attachment.create({
      data: {
        file: path,
        name,
        card: {
          connect: { id: updateId },
        },
      },
    })

    const card = await prisma.card.findUnique({
      where: { id: updateId },
      include: {
        assignedUsers: true,
      },
    })

    if (card) {
      await logActivity(
        updateId,
        NotificationEventConstants.ATTACHMENT_ADDED,
        card.name || "Card",
        authorName || "Someone",
      )
    }

    return attachment
  } catch (error) {
    showErrorToast("Error creating attachment:", error)
    throw error
  }
}
export const allAttachment = async ({ updateId }) => {
  const attachment = await prisma.attachment.findMany({
    where: {
      cardId: updateId,
    },
  })
  return attachment
}

export const handleDeleteAttachment = async ({ id }) => {
  await prisma.attachment.delete({
    where: {
      id,
    },
  })
}

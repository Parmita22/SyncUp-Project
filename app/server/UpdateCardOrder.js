"use server"

import prisma from "@/src/lib/prisma"
import { logActivity } from "./task"
import { NotificationEventConstants } from "@/src/components/notification/eventMapper"

export const updateCardPositionInDB = async (
  cardId,
  newTaskId,
  newPosition,
) => {
  const existingCardsCount = await prisma.card.count({
    where: { taskId: newTaskId },
  })
  const correctedPosition = Math.min(newPosition, existingCardsCount)
  await prisma.Card.update({
    where: { id: cardId },
    data: {
      taskId: newTaskId,
      order: correctedPosition,
    },
  })
  const task = await prisma.task.findUnique({
    where: { id: newTaskId },
    select: { category: true },
  })

  if (task.category === "Release") {
    await prisma.card.update({
      where: { id: cardId },
      data: {
        status: "archived",
      },
    })
  }
}

export const moveCardToList = async (
  cardId,
  fromListId,
  toListId,
  authorName = null,
) => {
  try {
    const existingCardsCount = await prisma.card.count({
      where: { taskId: toListId },
    })
    const oldTask = await prisma.task.findUnique({
      where: { id: fromListId },
      select: { category: true },
    })
    const newTask = await prisma.task.findUnique({
      where: { id: toListId },
      select: { category: true },
    })
    if (!oldTask || !newTask) {
      throw new Error("Invalid task categories")
    }
    const result = await updateCardPositionInDB(
      cardId,
      toListId,
      existingCardsCount,
    )
    const task = await prisma.task.findUnique({
      where: { id: toListId },
      select: { category: true },
    })

    const categoryProgress = {
      Backlog: 0,
      Todo: 10,
      "In Progress": 50,
      Done: 80,
      Release: 100,
    }
    const parentChecklistItem = await prisma.checklistItem.findFirst({
      where: { convertedCardId: cardId },
    })
    await prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: cardId },
        data: {
          progress: categoryProgress[task.category] || 0,
          isCompleted: task.category === "Done",
        },
      })
      if (parentChecklistItem) {
        await tx.checklistItem.update({
          where: { id: parentChecklistItem.id },
          data: {
            isComplete: task.category === "Done",
          },
        })
      }
      if (authorName && oldTask.category !== newTask.category) {
        await logActivity(
          cardId,
          NotificationEventConstants.CATEGORY_CHANGED,
          `from ${oldTask.category} to ${newTask.category}`,
          authorName,
        )
        console.log("[DEBUG] Activity logged for category change")
      }
    })

    return result
  } catch (error) {
    console.error("Error in moveCardToList:", error)
    throw error
  }
}

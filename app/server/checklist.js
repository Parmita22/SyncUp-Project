"use server"

import prisma from "@/src/lib/prisma"
import {
  NotificationEventConstants,
  mapEventToMessage,
} from "@/src/components/notification/eventMapper"

export const logActivity = async (
  tx,
  cardId,
  eventType,
  details,
  triggeredBy,
) => {
  const formattedMessage = mapEventToMessage(eventType, triggeredBy, details)
  await tx.activity.create({
    data: {
      cardId,
      eventType,
      details: formattedMessage,
      triggeredBy,
    },
  })
}

const getAllDescendantCards = async (tx, cardId) => {
  const descendants = []

  const card = await tx.card.findUnique({
    where: { id: cardId },
    include: {
      checklistItems: {
        where: {
          NOT: { convertedCardId: null },
        },
        select: {
          convertedCardId: true,
        },
      },
    },
  })

  if (!card) return descendants

  const convertedCardIds = card.checklistItems
    .map((item) => item.convertedCardId)
    .filter((id) => id !== null)

  descendants.push(...convertedCardIds)
  const nestedDescendantsArrays = await Promise.all(
    convertedCardIds.map((cardId) => getAllDescendantCards(tx, cardId)),
  )
  descendants.push(...nestedDescendantsArrays.flat())

  return descendants
}

export const deleteChecklistItem = async (itemId, authorName) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.checklistItem.findUnique({
        where: { id: itemId },
        select: {
          convertedCardId: true,
          title: true,
          cardId: true,
        },
      })
      if (item?.convertedCardId) {
        const descendants = await getAllDescendantCards(
          tx,
          item.convertedCardId,
        )
        const allCardsToDelete = [item.convertedCardId, ...descendants]
        await tx.activity.deleteMany({
          where: {
            cardId: {
              in: allCardsToDelete,
            },
          },
        })
        await Promise.all([
          tx.cardDependency.deleteMany({
            where: {
              OR: [
                { blockerId: { in: allCardsToDelete } },
                { blockedId: { in: allCardsToDelete } },
              ],
            },
          }),
          tx.checklistItem.deleteMany({
            where: { cardId: { in: allCardsToDelete } },
          }),
          tx.card.deleteMany({
            where: { id: { in: allCardsToDelete } },
          }),
        ])
      }
      await logActivity(
        tx,
        item.cardId,
        NotificationEventConstants.CHECKLIST_ITEM_DELETED,
        item.title,
        authorName || "Unknown User",
      )
      return tx.checklistItem.delete({
        where: { id: itemId },
      })
    })
  } catch (error) {
    console.error("Error deleting checklist item:", error)
    throw new Error("Failed to delete checklist item")
  }
}

export const updateChecklistItem = async (itemId, title, authorName) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.checklistItem.findUnique({
        where: { id: itemId },
        select: { convertedCardId: true, cardId: true },
      })

      const updatedItem = await tx.checklistItem.update({
        where: { id: itemId },
        data: { title },
      })

      if (item?.convertedCardId) {
        await tx.card.update({
          where: { id: item.convertedCardId },
          data: { name: title },
        })
      }

      await logActivity(
        tx,
        item.cardId,
        NotificationEventConstants.CHECKLIST_ITEM_UPDATED,
        `Checklist item updated to "${title}"`,
        authorName || "Unknown User",
      )

      return updatedItem
    })
  } catch (error) {
    console.error("Error updating checklist item:", error)
    throw new Error("Failed to update checklist item")
  }
}

export const createChecklistItem = async ({
  cardId,
  title,
  dueDate,
  assignedUserIds,
  authorName,
}) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const newItem = await tx.checklistItem.create({
        data: {
          title,
          cardId,
          dueDate,
          assignedUsers: {
            connect: assignedUserIds.map((id) => ({ id })),
          },
        },
      })

      await logActivity(
        tx,
        cardId,
        NotificationEventConstants.CHECKLIST_ITEM_ADDED,
        title,
        authorName || "Unknown User",
      )

      return newItem
    })
  } catch (error) {
    console.error("Error creating checklist item:", error)
    throw new Error("Failed to create checklist item")
  }
}
export const convertChecklistItemToCard = async ({
  itemId,
  categoryId,
  parentCardId,
  parentUrl,
  authorName,
}) => {
  try {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            label: true,
            assignedUsers: true,
            assignedTeams: true,
            task: true,
            priority: true,
          },
        },
      },
    })

    if (!item) {
      throw new Error("Checklist item not found")
    }

    const description = JSON.stringify({
      blocks: [
        {
          key: "converted",
          text: `Converted from checklist item in card: ${item.card.name}`,
          type: "unstyled",
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [
            {
              offset: 39,
              length: item.card.name.length,
              key: 0,
            },
          ],
          data: {},
        },
      ],
      entityMap: {
        0: {
          type: "LINK",
          mutability: "MUTABLE",
          data: {
            url: parentUrl,
          },
        },
      },
    })

    const result = await prisma.$transaction(async (tx) => {
      const newCard = await tx.card.create({
        data: {
          name: item.title,
          taskId: categoryId,
          description,
          priority: item.card.priority,
          assignedUsers: {
            connect: item.card.assignedUsers.map((u) => ({ id: u.id })),
          },
          label: {
            connect: item.card.label.map((l) => ({ id: l.id })),
          },
          assignedTeams: {
            connect: item.card.assignedTeams.map((t) => ({ id: t.id })),
          },
          blockers: {
            create: {
              blockedId: parentCardId,
            },
          },
        },
      })

      await tx.checklistItem.update({
        where: { id: itemId },
        data: {
          convertedCardId: newCard.id,
          isComplete: false,
        },
      })

      await logActivity(
        tx,
        item.card.id,
        NotificationEventConstants.CHECKLIST_ITEM_CONVERTED_TO_CARD,
        item.title,
        authorName || "Unknown User",
      )

      return { newCardId: newCard.id, newCardTitle: item.title }
    })

    return result
  } catch (error) {
    console.error("Error converting checklist item to card:", error)
    throw new Error(`Failed to convert item to card: ${error.message}`)
  }
}
export const toggleChecklistItem = async (itemId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.checklistItem.findUnique({
        where: { id: itemId },
        include: {
          convertedCard: {
            include: {
              task: { include: { board: true } },
              checklistItems: true,
              blockedBy: true,
            },
          },
          card: { include: { task: true } },
        },
      })
      if (item.convertedCard) {
        const hasBlockers = item.convertedCard.blockedBy.length > 0
        const hasChecklist = item.convertedCard.checklistItems.length > 0

        if (hasBlockers || hasChecklist) {
          const error = new Error(
            `The converted card has ${
              hasBlockers ? "dependencies" : "checklist items"
            }`,
          )
          error.isRestrictionError = true
          throw error
        }
      }

      const updatedItem = await tx.checklistItem.update({
        where: { id: itemId },
        data: { isComplete: !item.isComplete },
      })

      if (item.convertedCard) {
        const { boardId } = item.card.task
        const doneTask = await tx.task.findFirstOrThrow({
          where: {
            boardId,
            category: "Done",
          },
        })

        await tx.card.update({
          where: { id: item.convertedCard.id },
          data: {
            isCompleted: !item.isComplete,
            progress: !item.isComplete ? 100 : 0,
            taskId: !item.isComplete ? doneTask.id : item.convertedCard.task.id,
          },
        })
      }

      return updatedItem
    })
  } catch (error) {
    if (error.isRestrictionError) {
      throw error
    }
    throw new Error("Failed to toggle item")
  }
}

export const getChecklistItems = async (cardId) => {
  try {
    const items = await prisma.checklistItem.findMany({
      where: { cardId },
      include: {
        assignedUsers: true,
        convertedCard: {
          select: {
            id: true,
            status: true,
            isCompleted: true,
          },
        },
      },
    })

    return items
  } catch (error) {
    console.error("Error fetching checklist items:", error)
    throw new Error("Failed to fetch checklist items")
  }
}

export const deleteAllChecklistItems = async (cardId, authorName) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const items = await tx.checklistItem.findMany({
        where: { cardId },
        select: { id: true, convertedCardId: true },
      })
      const allCardsToDelete = (
        await Promise.all(
          items
            .filter((item) => item.convertedCardId)
            .map(async (item) => {
              const descendants = await getAllDescendantCards(
                tx,
                item.convertedCardId,
              )
              return [item.convertedCardId, ...descendants]
            }),
        )
      ).flat()
      if (allCardsToDelete.length) {
        await tx.activity.deleteMany({
          where: {
            cardId: {
              in: allCardsToDelete,
            },
          },
        })
        await Promise.all([
          tx.cardDependency.deleteMany({
            where: {
              OR: [
                { blockerId: { in: allCardsToDelete } },
                { blockedId: { in: allCardsToDelete } },
              ],
            },
          }),
          tx.checklistItem.deleteMany({
            where: { cardId: { in: allCardsToDelete } },
          }),
          tx.card.deleteMany({
            where: { id: { in: allCardsToDelete } },
          }),
        ])
      }

      const deletedItems = await tx.checklistItem.deleteMany({
        where: { cardId },
      })

      await logActivity(
        tx,
        cardId,
        NotificationEventConstants.CHECKLIST_DELETE_ALL,
        "All checklist items deleted",
        authorName || "Unknown User",
      )

      return deletedItems
    })
  } catch (error) {
    console.error("Error deleting all checklist items:", error)
    throw new Error("Failed to delete all checklist items")
  }
}

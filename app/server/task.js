"use server"

import prisma from "@/src/lib/prisma"
import createNotification from "./NotificationCreating"
import {
  NotificationEventConstants,
  mapEventToMessage,
} from "@/src/components/notification/eventMapper"
import { showErrorToast } from "../src/utils/toastUtils"
import { sendSlackDMAlerts } from "./slackAlerts"
import { fetchNotificationPreferences } from "../src/components/notification/NotificationData"

const categoryProgress = {
  Backlog: 0,
  Todo: 10,
  "In Progress": 50,
  Done: 80,
  Release: 100,
}

const slackToken = process.env.SLACK_BOT_TOKEN
export const logActivity = async (cardId, eventType, details, triggeredBy) => {
  try {
    const activityMessage = mapEventToMessage(eventType, triggeredBy, details)

    const activity = await prisma.activity.create({
      data: {
        cardId,
        eventType,
        details: activityMessage,
        triggeredBy,
        createdAt: new Date(),
      },
    })
    return activity
  } catch (error) {
    console.error("Error logging activity:", error)
    throw new Error("Failed to log activity.")
  }
}

export const createTitle = async (
  { title, dueDate, priority, description, srNumber, issue },
  id,
  boarduser,
  authorName,
) => {
  if (!title || title.trim() === "") {
    throw new Error("Card title cannot be empty")
  }

  const task = await prisma.Task.findUnique({
    where: { id },
    select: {
      category: true,
      board: {
        select: {
          users: { select: { id: true, email: true } },
        },
      },
    },
  })

  if (!task) {
    throw new Error("Task not found")
  }

  const defaultProgress = categoryProgress[task.category] || 0
  const currentDate = new Date()
  const adjustedDueDate = dueDate ? new Date(dueDate) : currentDate

  const newCard = await prisma.Card.create({
    data: {
      name: title.trim(),
      taskId: id,
      progress: defaultProgress,
      dueDate: adjustedDueDate,
      priority: priority || "medium",
      description: description || null,
      srNumber: srNumber || null,
      issue: issue || null,
    },
  })

  const usersWithPreferences = await Promise.all(
    task.board.users.map(async (user) => {
      try {
        const preferences = await fetchNotificationPreferences(user.email)
        return { id: user.id, preferences }
      } catch (error) {
        console.error(
          `Error fetching notification preferences for user ID ${user.id}.`,
        )
        return { id: user.id, preferences: {} }
      }
    }),
  )

  const usersToNotify = usersWithPreferences
    .filter((user) => user.preferences.cardEvents)
    .map((user) => user.id)

  if (usersToNotify.length > 0) {
    await createNotification(
      authorName || "System",
      NotificationEventConstants.CARD_CREATED,
      title,
      usersToNotify,
    )
  }

  return newCard
}
export const updateCardTitle = async ({ updateId, name, authorName }) => {
  const existingCard = await prisma.Card.findUnique({
    where: {
      id: parseInt(updateId, 10),
    },
    select: {
      name: true,
    },
  })

  const oldName = existingCard?.name

  await prisma.Card.update({
    where: {
      id: parseInt(updateId, 10),
    },
    data: {
      name,
    },
  })
  await logActivity(
    updateId,
    NotificationEventConstants.CARD_RENAMED,
    oldName,
    authorName,
  )
}

export const deleteTask = async (taskId, boarduser, username) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const cardToDelete = await tx.card.findUnique({
        where: { id: parseInt(taskId, 10) },
        include: {
          task: {
            include: {
              board: {
                include: {
                  users: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
      if (!cardToDelete) {
        throw new Error("Card not found")
      }
      const getAllDescendantCards = async (cardId) => {
        const descendants = []
        const card = await tx.card.findUnique({
          where: { id: parseInt(cardId, 10) },
          include: {
            checklistItems: {
              where: {
                NOT: { convertedCardId: null },
              },
              select: {
                convertedCardId: true,
              },
            },
            assignedUsers: true,
            assignedTeams: true,
            label: true,
            blockers: true,
            blockedBy: true,
          },
        })

        if (!card) return descendants
        const convertedCardIds = card.checklistItems
          .map((item) => item.convertedCardId)
          .filter((id) => id !== null)

        descendants.push(...convertedCardIds)
        const nestedDescendantsArrays = await Promise.all(
          convertedCardIds.map((cardId) => getAllDescendantCards(cardId)),
        )
        descendants.push(...nestedDescendantsArrays.flat())

        return descendants
      }
      if (!cardToDelete) {
        throw new Error("Card not found")
      }

      const allDescendantCards = await getAllDescendantCards(
        parseInt(taskId, 10),
      )
      const allCardsToDelete = [parseInt(taskId, 10), ...allDescendantCards]
      await Promise.all(
        allCardsToDelete.reverse().map(async (cardId) => {
          try {
            await Promise.all([
              tx.cardDependency.deleteMany({
                where: {
                  OR: [{ blockerId: cardId }, { blockedId: cardId }],
                },
              }),
              tx.checklistItem.deleteMany({
                where: { cardId },
              }),
              tx.activity.deleteMany({
                where: { cardId },
              }),
              tx.comment.deleteMany({
                where: { cardId },
              }),
            ])
            await tx.card.delete({
              where: { id: cardId },
            })
          } catch (error) {
            console.error(`Error deleting card with ID ${cardId}:`, error)
            throw error
          }
        }),
      )
      if (boarduser && username) {
        const usersWithPreferences = await Promise.all(
          cardToDelete.task.board.users.map(async (user) => {
            try {
              if (!user.email) {
                console.warn(
                  `User ${user.id} has no email, skipping preference fetch.`,
                )
                return { id: user.id, preferences: {} }
              }
              const preferences = await fetchNotificationPreferences(user.email)
              return { id: user.id, preferences }
            } catch (error) {
              console.error(
                `Error fetching preferences for user ${user.id}:`,
                error,
              )
              return { id: user.id, preferences: {} }
            }
          }),
        )

        const usersToNotify = usersWithPreferences
          .filter((user) => user.preferences.cardEvents)
          .map((user) => user.id)

        if (usersToNotify.length > 0) {
          await createNotification(
            username,
            NotificationEventConstants.CARD_DELETED,
            cardToDelete.name,
            usersToNotify,
          )
        }
      }

      return { success: true }
    })
  } catch (error) {
    console.error("Error in deleteTask function:", error)
    throw new Error("Failed to delete card")
  }
}

export const updateInfo = async ({ updateId, description, authorName }) => {
  try {
    const card = await prisma.card.update({
      where: {
        id: updateId,
      },
      data: {
        description: description
          ? JSON.stringify(JSON.parse(description))
          : null,
      },
    })

    if (description) {
      await logActivity(
        updateId,
        NotificationEventConstants.CARD_DESCRIPTION_UPDATED,
        card.name,
        authorName,
      )
    }

    return card
  } catch (error) {
    if (description && error instanceof SyntaxError) {
      throw new Error("Invalid description format")
    }
    console.error("Error updating description:", error)
    throw new Error("Failed to update description")
  }
}

export const updateUser = async ({ selectedUserId, updateId, authorName }) => {
  const card = await prisma.card.update({
    where: {
      id: updateId,
    },
    data: {
      assignedUsers: selectedUserId
        ? {
            connect: selectedUserId.map((id) => ({ id })),
          }
        : [],
    },
  })

  if (authorName) {
    const assignedUserNames = await prisma.user.findMany({
      where: {
        id: {
          in: selectedUserId,
        },
      },
      select: {
        name: true,
      },
    })

    const assigneeNames = assignedUserNames.map((user) => user.name).join(", ")
    const details = `Assigned to: ${assigneeNames}`
    await logActivity(
      updateId,
      NotificationEventConstants.USER_ASSIGNED,
      details,
      authorName,
    )
  }

  const slackToken = process.env.SLACK_BOT_TOKEN
  await sendSlackDMAlerts(slackToken, { cardIds: [updateId] })
  return card
}

export const unassignUser = async ({
  selectedUserId,
  updateId,
  authorName = null,
}) => {
  try {
    const userId = selectedUserId
    const unassignedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })

    const card = await prisma.card.update({
      where: {
        id: updateId,
      },
      data: {
        assignedUsers: {
          disconnect: selectedUserId ? [{ id: userId }] : [],
        },
      },
    })

    if (authorName && unassignedUser) {
      const details = unassignedUser.name
      await logActivity(
        updateId,
        NotificationEventConstants.USER_UNASSIGNED,
        details,
        authorName,
      )
    }

    return card
  } catch (error) {
    console.error("Error unassigning user:", error)
    throw new Error("Failed to unassign user.")
  }
}

export const cardUsers = async ({ updateId }) => {
  try {
    if (updateId) {
      const card = await prisma.card.findUnique({
        where: {
          id: updateId,
        },
        include: {
          assignedUsers: true,
        },
      })
      return card?.assignedUsers
    }
  } catch (error) {
    return error
  }
  return null
}

export const cardData = async ({ updateId }) => {
  const card = await prisma.card.findUnique({
    where: {
      id: updateId,
    },
    include: {
      assignedUsers: true,
      label: true,
      task: true,
      comments: true,
      attachments: true,
    },
  })
  return {
    ...card,
    issue: card?.issue || "",
  }
}

export const updateDates = async ({
  updateId,
  startValue,
  endValue,
  authorName = null,
}) => {
  try {
    const card = await prisma.card.update({
      where: {
        id: updateId,
      },
      data: {
        createdAt: new Date(startValue),
        dueDate: new Date(endValue),
      },
    })

    await logActivity(
      updateId,
      NotificationEventConstants.CARD_DATES_UPDATED,
      card.name,
      authorName,
    )
    await sendSlackDMAlerts(slackToken, {
      cardIds: [updateId],
      forceAlert: true,
      updatedDueDate: endValue,
    })

    return card
  } catch (error) {
    throw new Error("Failed to update card dates")
  }
}

export const checkCompleted = async ({
  updateId,
  isChecked,
  authorName = null,
}) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: updateId },
        include: {
          blockedBy: {
            include: {
              blocker: {
                select: {
                  id: true,
                  isCompleted: true,
                },
              },
            },
          },
          blockers: {
            include: {
              blocked: {
                select: {
                  id: true,
                  isCompleted: true,
                },
              },
            },
          },
          checklistItems: {
            select: {
              id: true,
              isComplete: true,
              convertedCardId: true,
            },
          },
          task: {
            include: {
              board: true,
            },
          },
        },
      })

      if (!card) {
        throw new Error("Card not found")
      }

      if (isChecked) {
        const incompleteBlockers = card.blockedBy.filter(
          (dep) => !dep.blocker.isCompleted,
        )

        if (incompleteBlockers.length > 0) {
          throw new Error(
            "Cannot complete card until all blocker cards are completed",
          )
        }
        const incompleteItems = card.checklistItems.filter(
          (item) => !item.isComplete && !item.convertedCardId,
        )

        if (incompleteItems.length > 0) {
          showErrorToast(
            "Cannot complete card until all checklist items are completed",
          )
          throw new Error(
            "Cannot complete card until all checklist items are completed",
          )
        }
        const doneTask = await tx.task.findFirst({
          where: {
            boardId: card.task.boardId,
            category: "Done",
          },
        })

        if (!doneTask) {
          throw new Error("Done category not found")
        }

        await tx.card.update({
          where: { id: updateId },
          data: {
            isCompleted: true,
            progress: 100,
            taskId: doneTask.id,
          },
        })
        const parentChecklistItem = await tx.checklistItem.findFirst({
          where: { convertedCardId: updateId },
        })

        if (parentChecklistItem) {
          await tx.checklistItem.update({
            where: { id: parentChecklistItem.id },
            data: { isComplete: true },
          })
        }
      } else {
        await tx.card.update({
          where: { id: updateId },
          data: {
            isCompleted: false,
            progress: 0,
          },
        })

        const parentChecklistItem = await tx.checklistItem.findFirst({
          where: { convertedCardId: updateId },
        })

        if (parentChecklistItem) {
          await tx.checklistItem.update({
            where: { id: parentChecklistItem.id },
            data: { isComplete: false },
          })
        }
      }

      if (authorName) {
        await logActivity(
          updateId,
          NotificationEventConstants.CARD_UPDATED,
          card.name,
          authorName,
        )
      }
      return { success: true }
    })
  } catch (error) {
    showErrorToast("Error updating card completion status:", error)
    throw error
  }
}

export const addCardDependency = async ({
  blockerId,
  blockedId,
  authorName,
}) => {
  try {
    const blockerCard = await prisma.card.findUnique({
      where: { id: parseInt(blockerId, 10) },
      select: { isCompleted: true, name: true },
    })

    if (blockerCard.isCompleted) {
      return {
        error: "Cannot add dependency. The blocker card is already completed.",
      }
    }
    const blockedCard = await prisma.card.findUnique({
      where: { id: parseInt(blockedId, 10) },
      select: { isCompleted: true, name: true },
    })

    if (blockedCard.isCompleted) {
      return {
        error: "Cannot add dependency. Current card is already completed.",
      }
    }
    await prisma.cardDependency.create({
      data: {
        blockerId: parseInt(blockerId, 10),
        blockedId: parseInt(blockedId, 10),
      },
    })
    if (authorName) {
      await logActivity(
        blockedId,
        NotificationEventConstants.DEPENDENCY_ADDED,
        `Blocked by: ${blockerCard.name}`,
        authorName,
      )
    }
    return { success: true }
  } catch (error) {
    showErrorToast("Error adding card dependency:", error)
    return { error: "Failed to add card dependency" }
  }
}

export const removeCardDependency = async ({
  blockerId,
  blockedId,
  authorName,
}) => {
  try {
    const blockerCard = await prisma.card.findUnique({
      where: { id: parseInt(blockerId, 10) },
      select: { name: true },
    })
    await prisma.cardDependency.deleteMany({
      where: {
        blockerId: parseInt(blockerId, 10),
        blockedId: parseInt(blockedId, 10),
      },
    })
    if (authorName) {
      await logActivity(
        blockedId,
        NotificationEventConstants.DEPENDENCY_REMOVED,
        `No longer blocked by: ${blockerCard.name}`,
        authorName,
      )
    }
    return { success: true }
  } catch (error) {
    showErrorToast("Error removing card dependency:", error)
    return { error: "Failed to remove card dependency" }
  }
}

export const getCardDependencies = async (cardId) => {
  try {
    const blockers = await prisma.cardDependency.findMany({
      where: {
        blockedId: parseInt(cardId, 10),
      },
      include: {
        blocker: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    })
    const blockedBy = await prisma.cardDependency.findMany({
      where: {
        blockerId: parseInt(cardId, 10),
      },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    })

    const formattedBlockers = await Promise.all(
      blockers
        .filter((dep) => dep.blocker.status !== "archived")
        .map(async (dep) => {
          const blockerCard = await prisma.card.findUnique({
            where: { id: dep.blocker.id },
            select: { isCompleted: true, photo: true },
          })
          return {
            id: dep.blocker.id,
            name: dep.blocker.name,
            isCompleted: blockerCard.isCompleted,
          }
        }),
    )

    const formattedBlockedBy = blockedBy
      .filter((dep) => dep.blocked.status !== "archived")
      .map((dep) => ({
        id: dep.blocked.id,
        name: dep.blocked.name,
      }))

    return {
      blockers: formattedBlockers,
      blockedBy: formattedBlockedBy,
    }
  } catch (error) {
    showErrorToast("Error fetching card dependencies:", error)
    return { error: "Failed to fetch dependencies" }
  }
}

export const updateCardPriority = async ({
  updateId,
  priority,
  authorName = null,
}) => {
  try {
    const card = await prisma.card.update({
      where: {
        id: updateId,
      },
      data: {
        priority,
      },
    })
    if (authorName) {
      await logActivity(
        updateId,
        NotificationEventConstants.CARD_PRIORITY_UPDATED,
        card.name,
        authorName,
      )
    }

    return card
  } catch (error) {
    console.error("Error updating card priority:", error)
    throw new Error("Failed to update card priority.")
  }
}

export const cardPriority = async ({ updateId }) => {
  const priority = await prisma.card.findUnique({
    where: {
      id: updateId,
    },
  })

  return priority
}

export const unreleasedCards = async (boardId) => {
  try {
    const id = parseInt(boardId, 10)
    const tasks = await prisma.task.findMany({
      where: {
        boardId: id,
        category: "Done",
        cards: {
          some: {
            release: "UNRELEASED",
          },
        },
      },
      include: {
        cards: {
          where: {
            release: "UNRELEASED",
          },
        },
      },
    })
    const cardIds = tasks.flatMap((task) => task.cards.map((card) => card.id))
    return cardIds
  } catch (error) {
    return error
  }
}

export const fetchUserTasks = async (userId) => {
  try {
    const tasks = await prisma.card.findMany({
      where: {
        assignedUsers: {
          some: {
            id: userId,
          },
        },
      },
      select: {
        name: true,
        isCompleted: true,
      },
    })

    return tasks
  } catch (error) {
    showErrorToast("Error fetching user tasks:", error)
    return []
  }
}

export const unassignTeam = async ({ selectedTeamId, updateId }) => {
  const parsedTeamId = parseInt(selectedTeamId, 10)
  if (Number.isNaN(parsedTeamId)) {
    return
  }
  await prisma.card.update({
    where: { id: updateId },
    data: {
      assignedTeams: {
        disconnect: [{ id: parsedTeamId }],
      },
    },
  })
}

export const cardTeams = async ({ updateId }) => {
  try {
    if (updateId) {
      const card = await prisma.card.findUnique({
        where: { id: updateId },
        include: {
          assignedTeams: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return card?.assignedTeams || []
    }
  } catch (error) {
    return []
  }
  return []
}

export const updateTaskDates = async ({ taskId, startDate, endDate }) => {
  try {
    const updatedTask = await prisma.card.update({
      where: { id: parseInt(taskId, 10) },
      data: {
        createdAt: new Date(startDate),
        dueDate: new Date(endDate),
      },
    })
    return updatedTask
  } catch (error) {
    showErrorToast("Error updating task dates:", error)
    throw new Error("Failed to update task dates")
  }
}

export const updateTaskProgress = async ({ taskId, progress }) => {
  try {
    const updatedTask = await prisma.card.update({
      where: { id: parseInt(taskId, 10) },
      data: {
        progress: parseInt(progress, 10),
        isCompleted: parseInt(progress, 10) === 80,
      },
    })
    return updatedTask
  } catch (error) {
    showErrorToast("Error updating task progress:", error)
    throw new Error("Failed to update task progress")
  }
}

export const getTaskCategory = async (cardId) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: parseInt(cardId, 10) },
      select: {
        task: {
          select: {
            category: true,
          },
        },
      },
    })
    return card?.task?.category || "Backlog"
  } catch (error) {
    showErrorToast("Error fetching task category:", error)
    throw new Error("Failed to fetch task category")
  }
}

export const getAllCardsOnBoard = async (boardId) => {
  try {
    const allCards = await prisma.card.findMany({
      where: {
        task: {
          boardId: parseInt(boardId, 10),
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    })

    const allDependencies = await prisma.cardDependency.findMany({
      select: {
        blockerId: true,
        blockedId: true,
      },
    })

    const blockerIds = new Set(allDependencies.map((dep) => dep.blockerId))
    const blockedByIds = new Set(allDependencies.map((dep) => dep.blockedId))

    const cardsWithStatus = allCards.map((card) => {
      const isBlocker = blockerIds.has(card.id)
      const isBlockedBy = blockedByIds.has(card.id)
      return {
        ...card,
        isBlocker,
        isBlockedBy,
        isIndependent: !isBlocker && !isBlockedBy,
      }
    })

    return cardsWithStatus
  } catch (error) {
    showErrorToast("Error fetching all cards on board:", error)
    return { error: "Failed to fetch cards" }
  }
}

export const createCardFromSlack = async ({
  title,
  description = "",
  categoryId,
  priority = "medium",
  dueDate = null,
  labels = [],
  assignedUsers = [],
  teams = [],
  username,
}) => {
  try {
    if (!title || !categoryId) {
      throw new Error("Title and category ID are required")
    }
    const formattedDescription = JSON.stringify({
      blocks: [
        {
          text: description,
          type: "unstyled",
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {},
        },
      ],
      entityMap: {},
    })

    const task = await prisma.Task.findUnique({
      where: { id: categoryId },
      select: {
        category: true,
        board: {
          select: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!task) {
      throw new Error("Invalid category ID")
    }
    const defaultProgress = categoryProgress[task.category] || 0
    const actualUser = task.board.users.find((user) =>
      user.email.toLowerCase().includes(username.toLowerCase()),
    )

    const card = await prisma.Card.create({
      data: {
        name: title,
        description: formattedDescription,
        taskId: categoryId,
        progress: defaultProgress,
        priority,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        assignedUsers: {
          connect: assignedUsers.map((id) => ({ id })),
        },
        label: {
          connect: labels.map((id) => ({ id })),
        },
        assignedTeams: {
          connect: teams.map((id) => ({ id: parseInt(id, 10) })),
        },
      },
    })
    const boardUserIds = task.board.users.map((user) => user.id)
    await createNotification(
      actualUser?.name || username,
      NotificationEventConstants.CARD_CREATED,
      title,
      boardUserIds,
    )
    return card
  } catch (error) {
    throw new Error(`Failed to create card: ${error.message}`)
  }
}

export const getAllAssignedCards = async (userEmail, organizationName) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        board: {
          organization: {
            name: organizationName,
          },
        },
        cards: {
          some: {
            assignedUsers: {
              some: {
                email: userEmail,
              },
            },
            AND: {
              status: "active",
              release: "UNRELEASED",
            },
          },
        },
      },
      include: {
        cards: {
          where: {
            assignedUsers: {
              some: {
                email: userEmail,
              },
            },
            AND: {
              status: "active",
              release: "UNRELEASED",
            },
          },
          include: {
            assignedUsers: true,
            label: true,
            task: true,
          },
        },
      },
    })
    return tasks
  } catch (error) {
    throw new Error("Failed to fetch assigned cards")
  }
}

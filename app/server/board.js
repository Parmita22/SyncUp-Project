"use server"

import prisma from "@/src/lib/prisma"
import createNotification from "./NotificationCreating"
import { NotificationEventConstants } from "@/src/components/notification/eventMapper"
import { fetchNotificationPreferences } from "@/src/components/notification/NotificationData"

export const getAllboards = async (email, organizationName) => {
  const boards = await prisma.board.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              users: {
                some: {
                  email,
                },
              },
            },
            {
              visibility: "PUBLIC",
            },
          ],
        },
        {
          organization: {
            name: organizationName,
          },
        },
      ],
    },
    include: {
      users: true,
      tasks: true,
      labels: true,
    },
  })
  return boards
}
export const createboard = async (
  boardName,
  visibility,
  selectedBackground,
  selectedUsers,
  organisations,
  username,
) => {
  const uniqueSelectedUsers = await Promise.all(
    Array.from(
      new Set(selectedUsers.filter((id) => id !== undefined && id !== null)),
    ).map(async (id) => {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id, 10) },
        select: { id: true, email: true },
      })
      return user
    }),
  )
  const newBoard = await prisma.board.create({
    data: {
      name: boardName,
      visibility,
      background: selectedBackground,
      users: {
        connect: uniqueSelectedUsers,
      },
      organization: {
        connect: { name: organisations },
      },
    },
  })
  const defaultCategories = [
    { category: "Backlog", color: "#f1c40f" },
    { category: "Todo", color: "#e74c3c" },
    { category: "In Progress", color: "#3498db" },
    { category: "Done", color: "#2ecc71" },
    { category: "Release", color: "#9b59b6" },
  ]
  await defaultCategories.reduce(
    async (prevPromise, { category, color }, index) => {
      await prevPromise
      return prisma.task.create({
        data: {
          category,
          boardId: newBoard.id,
          color,
          order: index + 1,
          createdAt: new Date(),
          dueDate: new Date(),
        },
      })
    },
    Promise.resolve(),
  )
  const usersWithPreferences = await Promise.all(
    uniqueSelectedUsers.map(async (user) => {
      try {
        const preferences = await fetchNotificationPreferences(user.email)
        return { id: user.id, preferences }
      } catch (error) {
        console.error(`Error fetching preferences for user ${user.id}:`, error)
        return { id: user.id, preferences: {} }
      }
    }),
  )

  const usersToNotify = usersWithPreferences
    .filter((user) => user.preferences.boardEvents)
    .map((user) => user.id)

  if (usersToNotify.length > 0) {
    await createNotification(
      username,
      NotificationEventConstants.BOARD_CREATED,
      boardName,
      usersToNotify,
    )
  }
  return newBoard.id
}
export const getUserByEmail = async (email) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  })
  return user?.id
}
export async function updateBoard(
  boardId,
  name,
  background,
  visibility,
  selectedUsers,
  usertounassign,
  selecteduser,
) {
  const selectedUserIds = selectedUsers.map((user) => parseInt(user.id, 10))
  const usersToUnassignIds =
    selectedUserIds.length === 0
      ? []
      : usertounassign.map((user) => parseInt(user.id, 10))
  const updatedBoard = await prisma.board.update({
    where: { id: boardId },
    data: {
      ...(name && { name }),
      ...(background && { background }),
      ...(visibility && { visibility }),
      users: {
        connect:
          visibility === "PUBLIC"
            ? selecteduser.map((user) => ({ id: user }))
            : selectedUserIds.map((id) => ({ id })),
        disconnect:
          visibility === "PUBLIC"
            ? []
            : usersToUnassignIds.map((id) => ({ id })),
      },
    },
  })
  return updatedBoard
}
export async function deleteBoard(boardId, boardname, boarduser, username) {
  try {
    const board = await prisma.board.findUnique({
      relationLoadStrategy: "join",
      where: {
        id: boardId,
      },
      include: {
        tasks: {
          include: {
            cards: true,
          },
        },
        labels: true,
      },
    })
    if (!board) {
      throw new Error("Board not found")
    }
    const usersWithPreferences = await Promise.all(
      boarduser.map(async (user) => {
        try {
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
      .filter((user) => user.preferences.boardEvents)
      .map((user) => user.id)

    if (usersToNotify.length > 0) {
      await createNotification(
        username,
        NotificationEventConstants.BOARD_DELETED,
        boardname,
        usersToNotify,
      )
    }
    const cardDeletionPromises = board.tasks.flatMap((task) =>
      task.cards.map(async (card) => {
        try {
          await prisma.activity.deleteMany({
            where: { cardId: card.id },
          })
          await prisma.cardDependency.deleteMany({
            where: {
              OR: [{ blockerId: card.id }, { blockedId: card.id }],
            },
          })
          await prisma.checklistItem.deleteMany({
            where: { cardId: card.id },
          })
          await prisma.card.delete({
            where: { id: card.id },
          })
        } catch (error) {
          console.error(`Error deleting card with ID ${card.id}:`, error)
          throw error
        }
      }),
    )
    await Promise.all(cardDeletionPromises)
    const taskDeletionPromises = board.tasks.map((task) =>
      prisma.task.delete({
        where: {
          id: task.id,
        },
      }),
    )
    await Promise.all(taskDeletionPromises)
    const labelDeletionPromises = board.labels.map((label) =>
      prisma.label.delete({
        where: {
          id: label.id,
        },
      }),
    )
    await Promise.all(labelDeletionPromises)
    const deletedBoard = await prisma.board.delete({
      where: {
        id: boardId,
      },
    })
    return deletedBoard
  } catch (error) {
    console.error("Error in deleteBoard function:", error)
    throw new Error("Failed to delete board")
  }
}
export const getAllUsers = async (name) => {
  try {
    const user = await prisma.Organization.findMany({
      where: {
        name,
      },
      include: {
        users: true,
      },
    })
    return user.map((item) => item.users).flat()
  } catch (error) {
    return error
  } finally {
    await prisma.$disconnect()
  }
}
export async function fetchBoardName(boardId) {
  try {
    const board = await prisma.board.findUnique({
      where: {
        id: parseInt(boardId.id, 10),
      },
      select: {
        name: true,
      },
    })
    return board.name
  } catch (error) {
    return error
  }
}
export async function fetchBoarduser(boardId) {
  try {
    const board = await prisma.board.findUnique({
      where: {
        id: parseInt(boardId, 10),
      },
      select: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    return board?.users.map((user) => ({
      name: user.name,
      email: user.email,
      id: user.id,
    }))
  } catch (error) {
    return error
  }
}

export const connectUserToPublicBoards = async (newUserId, boardData) => {
  const publicBoards = boardData.filter(
    (board) => board.visibility === "PUBLIC",
  )

  const updatePromises = publicBoards.map(async (board) => {
    await prisma.board.update({
      where: { id: board.id },
      data: {
        users: {
          connect: { id: newUserId },
        },
      },
    })
  })

  await Promise.all(updatePromises)
}

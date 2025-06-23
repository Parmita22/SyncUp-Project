"use server"

import prisma from "@/src/lib/prisma"

export default async function GetSyncupData(boardId) {
  const data = await prisma.task.findMany({
    relationLoadStrategy: "join",
    where: {
      boardId: parseInt(boardId, 10),
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      user: true,
      cards: {
        orderBy: {
          order: "asc",
        },
        include: {
          assignedUsers: true,
          label: true,
          comments: true,
          attachments: true,
          blockers: true,
          blockedBy: true,
          checklistItems: true,
          assignedTeams: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  const doneTask = await prisma.task.findFirst({
    where: {
      boardId: parseInt(boardId, 10),
      category: "Done",
    },
  })

  let archivedCardCountForRelease = 0
  if (doneTask) {
    archivedCardCountForRelease = await prisma.card.count({
      where: {
        taskId: doneTask.id,
        status: "archived",
      },
    })
  }

  return data.map((task) => ({
    id: task.id,
    title: task.category,
    color: task.color,
    cardCount: task.cards.length,
    activeCardCount: task.cards.filter((card) => card.status === "active")
      .length,
    archivedCardCount:
      task.category === "Release" ? archivedCardCountForRelease : 0,
    cards: task.cards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      photo: card.photo,
      order: card.order,
      createdAt: card.createdAt,
      dueDate: card.dueDate,
      release: card.release,
      isCompleted: card.isCompleted,
      priority: card.priority,
      status: card.status,
      progress: card.progress !== undefined ? card.progress : 0,
      assignedUsers: card.assignedUsers.map((user) => ({
        name: user.name,
        email: user.email,
        photo: user.photo,
      })),
      label: card.label.map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
      })),
      comments: card.comments.map((comments) => ({
        id: comments.id,
        description: comments.name,
      })),
      attachments: card.attachments.map((attachments) => ({
        id: attachments.id,
      })),
      assignedTeams: card.assignedTeams || [],
      taskColor: task.color,
      checklistItems: card.checklistItems,
      blockers: card.blockers,
      blockedBy: card.blockedBy,
    })),
  }))
}

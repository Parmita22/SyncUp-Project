"use server"

import prisma from "@/src/lib/prisma"

export async function createVersion(
  name,
  description,
  startDate,
  endDate,
  organizationName,
) {
  try {
    if (!name) {
      throw new Error("Name are required")
    }
    const organization = await prisma.organization.findUnique({
      where: { name: organizationName },
    })
    const version = await prisma.version.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        releaseDate: endDate ? new Date(endDate) : null,
        organizationId: organization.id,
      },
    })
    return version
  } catch (error) {
    throw new Error(`Error creating version: ${error.message}`)
  }
}
export async function versionData(organizationName) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { name: organizationName },
    })
    const versions = await prisma.version.findMany({
      where: {
        organizationId: organization.id,
      },
    })
    return versions
  } catch (error) {
    throw new Error(`Error fetching versions: ${error.message}`)
  }
}
export const releaseVersion = async (cardId, releaseId, organizationId) => {
  const releaseIdInt = parseInt(releaseId, 10)

  await prisma.version.update({
    where: {
      id: releaseIdInt,
    },
    data: {
      status: "RELEASED",
    },
  })

  await prisma.card.updateMany({
    where: {
      id: { in: cardId },
      task: {
        board: {
          organizationId,
        },
      },
    },
    data: {
      release: "RELEASED",
      versionId: releaseIdInt,
    },
  })

  return true
}
export const archiveCards = async (cardIds) => {
  await prisma.card.updateMany({
    where: {
      id: { in: cardIds },
    },
    data: {
      status: "archived",
    },
  })
  return true
}
export const unreleaseVersion = async (organizationId) => {
  const unreleasedVersion = await prisma.version.findFirst({
    where: {
      status: "UNRELEASED",
      organizationId,
    },
  })
  return unreleasedVersion
}

export const getCardsByVersionId = async (versionId, boardId) => {
  const id = parseInt(versionId, 10)
  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    include: {
      tasks: true,
    },
  })

  if (!board) {
    throw new Error("Board not found")
  }

  const taskIds = board.tasks.map((task) => task.id)
  if (taskIds.length === 0) {
    throw new Error("No tasks found in the board")
  }

  const cards = await prisma.card.findMany({
    where: {
      versionId: id,
      taskId: {
        in: taskIds,
      },
    },
  })
  if (!cards) {
    throw new Error("Cards not found for the given version and board")
  }
  return cards
}
export const getUnreleasedVersions = async (organizationId) => {
  try {
    const unreleasedVersions = await prisma.version.findMany({
      where: {
        status: "UNRELEASED",
        organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    })
    return unreleasedVersions
  } catch (error) {
    throw new Error(`Error fetching unreleased versions: ${error.message}`)
  }
}

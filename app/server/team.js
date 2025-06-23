"use server"

import prisma from "@/src/lib/prisma"
import { NotificationEventConstants } from "@/src/components/notification/eventMapper"
import { logActivity } from "./task"

async function createTeam(name, description, membersIds, boardId) {
  try {
    const membersArray = Array.from(membersIds)
    const createdTeam = await prisma.team.create({
      data: {
        name,
        description,
        members: {
          connect: membersArray.map((id) => ({ id: parseInt(id, 10) })),
        },
        boards: {
          connect: { id: parseInt(boardId, 10) },
        },
      },
    })
    return createdTeam
  } catch (error) {
    console.log("Error creating team", error)
    throw error
  }
}
async function fetchTeams(boardId) {
  try {
    const parsedBoardId = parseInt(boardId, 10)
    if (Number.isNaN(parsedBoardId)) {
      throw new Error("Invalid boardId provided to fetchTeams")
    }

    const teams = await prisma.team.findMany({
      where: {
        boards: {
          some: { id: parsedBoardId },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        members: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
        boards: {
          select: {
            id: true,
            name: true,
          },
        },
        cards: {
          select: {
            id: true,
            isCompleted: true,
          },
        },
      },
    })
    return teams
  } catch (error) {
    console.error("Error fetching teams:", error)
    throw error
  }
}
async function fetchAllTeamsByOrganization(boardIds) {
  try {
    if (!Array.isArray(boardIds) || boardIds.length === 0) {
      throw new Error(
        "Invalid boardIds provided to fetchAllTeamsByOrganization",
      )
    }

    const teams = await prisma.team.findMany({
      where: {
        boards: {
          some: {
            id: {
              in: boardIds,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        members: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
        boards: {
          select: {
            id: true,
            name: true,
          },
        },
        cards: {
          select: {
            id: true,
            isCompleted: true,
          },
        },
      },
    })
    return teams
  } catch (error) {
    console.error("Error fetching all teams by organization:", error)
    throw error
  }
}
async function editTeam(teamId, name, description, memberIds, boardId) {
  try {
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        description,
        members: {
          set: memberIds.map((id) => ({ id: parseInt(id, 10) })),
        },
        boards: {
          set: [{ id: parseInt(boardId, 10) }],
        },
      },
    })
    return updatedTeam
  } catch (error) {
    console.error("Error updating team", error)
    throw error
  }
}

async function deleteTeam(teamId) {
  await prisma.team.delete({
    where: { id: teamId },
  })
  return true
}

export const updateCardTeams = async ({
  updateId,
  teamIds,
  operation = "set",
  authorName = null,
}) => {
  try {
    if (!teamIds) {
      throw new Error("teamIds is undefined")
    }

    const updatedCard = await prisma.card.update({
      where: { id: updateId },
      data: {
        assignedTeams: {
          [operation]: teamIds.map((id) => ({ id: parseInt(id, 10) })),
        },
      },
      include: {
        assignedTeams: {
          include: {
            members: true,
          },
        },
      },
    })

    if (authorName) {
      const eventType =
        operation === "connect"
          ? NotificationEventConstants.TEAM_ASSIGNED_TO_CARD
          : NotificationEventConstants.TEAM_UNASSIGNED_FROM_CARD

      await logActivity(updateId, eventType, updatedCard.name, authorName)
    }

    return updatedCard
  } catch (error) {
    console.error("Error updating card teams:", error)
    throw new Error("Failed to update card teams.")
  }
}
export {
  createTeam,
  fetchTeams,
  editTeam,
  deleteTeam,
  fetchAllTeamsByOrganization,
}

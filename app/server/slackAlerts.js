import { WebClient } from "@slack/web-api"
import prisma from "@/src/lib/prisma"
import { getDueDateStatus } from "@/src/utils/getDueDateStatus"

async function getAlreadyNotifiedUsers(cardId) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const alerts = await prisma.cardAlert.findMany({
    where: { cardId, date: startOfToday },
    select: { userId: true },
  })
  return alerts.map((a) => a.userId)
}

export async function sendSlackDMAlerts(slackToken, options = {}) {
  if (!slackToken) {
    console.error("Missing Slack Bot Token")
    return { success: false, error: "Missing Slack Bot Token" }
  }

  const {
    cardIds = [],
    isNewAssignment = false,
    newlyAssignedUserIds = [],
    forceAlert = false,
    updatedDueDate = null,
  } = options

  const client = new WebClient(slackToken)
  const where = cardIds.length
    ? { id: { in: cardIds } }
    : {
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setDate(new Date().getDate() + 1)),
        },
      }

  const cards = await prisma.card.findMany({
    where,
    include: {
      assignedUsers: {
        include: { slackIntegrations: true },
      },
      task: {
        include: {
          board: {
            include: {
              organization: true,
            },
          },
        },
      },
      assignedTeams: true,
    },
  })

  const alertsToCreate = []
  const alertsSent = []

  await Promise.all(
    cards.map(async (card) => {
      const dueDateStatus = getDueDateStatus(card.dueDate)
      const status =
        forceAlert && updatedDueDate
          ? getDueDateStatus(updatedDueDate)
          : dueDateStatus
      const isUpdate = forceAlert && updatedDueDate

      let alertMessage = null
      if (status === "today") {
        alertMessage = isUpdate
          ? "🚨 URGENT Due Date Updated to Today!"
          : "🚨 URGENT Deadline Alert"
      } else if (status === "tomorrow") {
        alertMessage = isUpdate
          ? "⚠️ Due Date Updated to Tomorrow!"
          : "⚠️ Upcoming Deadline Reminder"
      }
      if (!alertMessage) return

      const alreadyNotified = await getAlreadyNotifiedUsers(card.id)
      const assignedTeams =
        card.assignedTeams.map((team) => team.name).join(", ") ||
        "No Teams Assigned"
      let usersToAlert = card.assignedUsers

      if (isNewAssignment) {
        usersToAlert = usersToAlert.filter((u) =>
          newlyAssignedUserIds.includes(u.id),
        )
      } else if (!forceAlert) {
        usersToAlert = usersToAlert.filter(
          (u) => !alreadyNotified.includes(u.id),
        )
      }
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      await Promise.all(
        usersToAlert.map(async (user) => {
          try {
            const slackInt = user.slackIntegrations[0]
            if (!slackInt) {
              return
            }

            const lookup = await client.users.lookupByEmail({
              email: user.email,
            })
            if (!lookup.ok || !lookup.user) {
              return
            }

            const convo = await client.conversations.open({
              users: lookup.user.id,
            })
            if (!convo.ok || !convo.channel) {
              return
            }
            const cardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${card.task.board.organization.name}/board/${card.task.boardId}/${card.id}`
            const dueDate = new Date(updatedDueDate || card.dueDate)

            await client.chat.postMessage({
              channel: convo.channel.id,
              blocks: [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: alertMessage,
                    emoji: true,
                  },
                },
                {
                  type: "section",
                  fields: [
                    {
                      type: "mrkdwn",
                      text: `*Card:*\n<${cardUrl}|${card.name}>`,
                    },
                    {
                      type: "mrkdwn",
                      text: `*Due Date:*\n${dueDate.toLocaleDateString("en-GB")}`,
                    },
                  ],
                },
                {
                  type: "section",
                  fields: [
                    {
                      type: "mrkdwn",
                      text: `*Priority:*\n${card.priority || "N/A"}`,
                    },
                    {
                      type: "mrkdwn",
                      text: `*Category:*\n${card.task.category || "Uncategorized"}`,
                    },
                  ],
                },
                {
                  type: "section",
                  fields: [
                    {
                      type: "mrkdwn",
                      text: `*Assigned Teams:*\n${assignedTeams}`,
                    },
                  ],
                },
                {
                  type: "context",
                  elements: [
                    { type: "mrkdwn", text: `🟢 Alert generated by *SyncUp*` },
                  ],
                },
              ],
            })

            alertsToCreate.push({
              cardId: card.id,
              userId: user.id,
              date: startOfToday,
            })

            alertsSent.push({
              user: user.email,
              card: card.name,
              type: alertMessage.includes("URGENT")
                ? "red_alert"
                : "yellow_alert",
            })
          } catch (err) {
            console.error(`Error alerting ${user.email}:`, err)
          }
        }),
      )
    }),
  )

  if (alertsToCreate.length) {
    await prisma.cardAlert.createMany({
      data: alertsToCreate,
      skipDuplicates: true,
    })
  }

  return {
    success: true,
    message: `Sent ${alertsSent.length} alerts`,
    alerts: alertsSent,
  }
}

import cron from "node-cron"
import { sendSlackDMAlerts } from "./slackAlerts"
import prisma from "@/src/lib/prisma"
import { showErrorToast } from "@/src/utils/toastUtils"
import { getDueDateStatus } from "@/src/utils/getDueDateStatus"

const slackToken = process.env.SLACK_BOT_TOKEN

const sendProgressBasedAlerts = async () => {
  try {
    const cards = await prisma.card.findMany({
      where: {
        OR: [
          {
            progress: {
              gte: 50,
              lt: 75,
            },
          },
          {
            progress: {
              gte: 75,
            },
          },
        ],
      },
      include: {
        assignedUsers: {
          include: {
            slackIntegrations: true,
          },
        },
      },
    })

    if (cards.length === 0) {
      showErrorToast("No cards with progress-based alerts.")
      return
    }
    const yellowAlertCards = cards.filter(
      (card) => card.progress >= 50 && card.progress < 75,
    )
    const redAlertCards = cards.filter((card) => card.progress >= 75)
    const dueTodayCards = cards.filter(
      (card) => getDueDateStatus(card.dueDate) === "today",
    )
    const dueTomorrowCards = cards.filter(
      (card) => getDueDateStatus(card.dueDate) === "tomorrow",
    )

    if (yellowAlertCards.length > 0) {
      await sendSlackDMAlerts(slackToken, {
        cardIds: yellowAlertCards.map((card) => card.id),
        alertType: "yellow",
      })
    }
    if (redAlertCards.length > 0) {
      await sendSlackDMAlerts(slackToken, {
        cardIds: redAlertCards.map((card) => card.id),
        alertType: "red",
      })
    }
    if (dueTodayCards.length > 0) {
      await sendSlackDMAlerts(slackToken, {
        cardIds: dueTodayCards.map((card) => card.id),
        alertType: "red",
      })
    }
    if (dueTomorrowCards.length > 0) {
      await sendSlackDMAlerts(slackToken, {
        cardIds: dueTomorrowCards.map((card) => card.id),
        alertType: "yellow",
      })
    }
  } catch (error) {
    showErrorToast("Error sending progress-based alerts:", error)
  }
}
cron.schedule("0 8 * * *", async () => {
  await sendProgressBasedAlerts()
})

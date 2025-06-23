/* eslint-disable  no-restricted-syntax */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { withPulse } from "@prisma/extension-pulse"

process.on("SIGINT", () => {
  process.exit(0)
})

const apiKey = process.env.PULSE_API_KEY
if (!apiKey) {
  throw new Error("PULSE_API_KEY is missing from environment variables.")
}

const prisma = new PrismaClient().$extends(withPulse({ apiKey }))

async function main() {
  try {
    const subscription = await prisma.user.subscribe()
    const addition = await prisma.card.subscribe()
    const newboard = await prisma.board.subscribe()
    const newlable = await prisma.label.subscribe()
    const team = await prisma.team.subscribe()
    const feedback = await prisma.feedback.subscribe()
    const task = await prisma.task.subscribe()
    const comment = await prisma.comment.subscribe()
    const notification = await prisma.notification.subscribe()

    process.on("exit", () => {
      notification.stop()
    })

    process.on("exit", () => {
      comment.stop()
    })

    process.on("exit", () => {
      task.stop()
    })

    process.on("exit", () => {
      feedback.stop()
    })

    process.on("exit", () => {
      subscription.stop()
    })

    process.on("exit", () => {
      addition.stop()
    })

    process.on("exit", () => {
      newboard.stop()
    })

    process.on("exit", () => {
      newlable.stop()
    })

    process.on("exit", () => {
      team.stop()
    })
  } catch (error) {
    process.exit(1)
  }
}
main()

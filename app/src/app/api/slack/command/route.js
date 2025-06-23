import { NextResponse } from "next/server"
import prisma from "@/src/lib/prisma"
import { createTitle } from "@/server/task"

async function updateSlackMessage(responseUrl, text) {
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "in_channel",
        replace_original: true,
        text,
      }),
    })
  } catch (error) {
    console.error("Error updating Slack message:", error)
  }
}

async function processCommand(formData, responseUrl) {
  try {
    const text = formData.get("text")
    const slackUsername = formData.get("user_name")
    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: slackUsername,
          mode: "insensitive",
        },
      },
      include: {
        slackIntegrations: true,
      },
    })

    if (!user?.slackIntegrations?.length) {
      await updateSlackMessage(
        responseUrl,
        "Please authorize the Slack from Ptask application. Visit your integration dashboard to connect Slack.",
      )
      return
    }

    if (!text) {
      await updateSlackMessage(
        responseUrl,
        'Please provide both board name and card name. Format: /syncup "board name" card name',
      )
      return
    }

    const matches = text.match(/^(?:"([^"]+)"|(\S+))\s+(.+)$/)

    if (!matches) {
      await updateSlackMessage(
        responseUrl,
        "Invalid format. Use:\n" +
          "• For board without spaces: /syncup boardname card title\n" +
          '• For board with spaces: /syncup "board name" card title',
      )
      return
    }

    const boardName = matches[1] || matches[2]
    const cardName = matches[3].trim()

    if (!boardName || !cardName) {
      await updateSlackMessage(
        responseUrl,
        "Missing board name or card name. Use:\n" +
          "• /syncup boardname card title\n" +
          '• /syncup "board name" card title',
      )
      return
    }

    await updateSlackMessage(
      responseUrl,
      `Creating card "${cardName}" in board "${boardName}"...`,
    )

    const board = await prisma.board.findFirst({
      where: {
        name: {
          equals: boardName,
          mode: "insensitive",
        },
        OR: [
          { visibility: "PUBLIC" },
          {
            visibility: "PRIVATE",
            users: {
              some: {
                email: {
                  contains: slackUsername,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
        users: {
          some: {
            email: {
              contains: slackUsername,
              mode: "insensitive",
            },
          },
        },
      },
      include: {
        tasks: {
          where: { category: "Backlog" },
        },
        users: {
          where: {
            email: {
              contains: slackUsername,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!board) {
      await updateSlackMessage(
        responseUrl,
        `Board "${boardName}" not found or you don't have access.\n\n` +
          `*Correct Format:*\n` +
          `• Single word board: \`/syncup boardname card title\`\n` +
          `• Board with spaces: \`/syncup "board name" card title\`\n\n` +
          `*Note:*\n` +
          `• Board name must be exact match\n` +
          `• You must be a member of the board\n`,
      )
      return
    }

    const backlogTask =
      board.tasks[0] ||
      (await prisma.task.create({
        data: {
          category: "Backlog",
          boardId: board.id,
          color: "#808080",
        },
      }))

    await createTitle(
      { title: cardName },
      backlogTask.id,
      board.users.map((u) => u.id),
      slackUsername,
    )

    await updateSlackMessage(
      responseUrl,
      `Successfully created card "${cardName}" in board "${boardName}"`,
    )
  } catch (error) {
    console.error("Error processing command:", error)
    await updateSlackMessage(
      responseUrl,
      "Failed to process command. Please try again.",
    )
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const responseUrl = formData.get("response_url")

    if (!responseUrl) {
      return NextResponse.json(
        {
          response_type: "ephemeral",
          text: "Invalid request: missing response_url",
        },
        { status: 400 },
      )
    }

    // Process the command asynchronously
    processCommand(formData, responseUrl)

    return NextResponse.json(
      {
        response_type: "in_channel",
        text: "Processing your request...",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in Slack command route:", error)
    return NextResponse.json(
      {
        response_type: "ephemeral",
        text: "An error occurred while processing your request.",
      },
      { status: 500 },
    )
  }
}

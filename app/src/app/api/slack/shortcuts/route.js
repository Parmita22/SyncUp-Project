import { NextResponse } from "next/server"
import { WebClient } from "@slack/web-api"
import { getAllboards, fetchBoarduser } from "@/server/board"
import { showAllData } from "@/server/category"
import { createCardFromSlack } from "@/server/task"
import { getLabels } from "@/server/label"
import { fetchTeams } from "@/server/team"
import { showErrorToast } from "@/src/utils/toastUtils"

import prisma from "@/src/lib/prisma"

async function sendDetailedCardMessage(client, channel, cardData, boardName) {
  const labelsText =
    Array.isArray(cardData.labels) && cardData.labels.length > 0
      ? cardData.labels.map((label) => `\`${label}\``).join(" ")
      : "None"

  const teamsText =
    Array.isArray(cardData.teams) && cardData.teams.length > 0
      ? cardData.teams.map((team) => `\`${team}\``).join(" ")
      : "None"

  try {
    const response = await client.chat.postMessage({
      channel,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "✨ New Card Created Successfully",
            emoji: true,
          },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Title:*\n${cardData.title}`,
            },
            {
              type: "mrkdwn",
              text: `*Board:*\n${boardName}`,
            },
          ],
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Category:*\n${cardData.category || "Backlog"}`,
            },
            {
              type: "mrkdwn",
              text: `*Priority:*\n${cardData.priority || "Medium"}`,
            },
          ],
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Due Date:*\n${cardData.dueDate ? new Date(cardData.dueDate).toLocaleDateString() : "Not set"}`,
            },
            {
              type: "mrkdwn",
              text: `*Assigned Users:*\n${cardData.assignedUsers?.length ? `👥 ${cardData.assignedUsers.length} users` : "None"}`,
            },
          ],
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Teams:*\n${teamsText}`,
            },
            {
              type: "mrkdwn",
              text: `*Labels:*\n${labelsText}`,
            },
          ],
        },
        cardData.description
          ? {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Description:*\n${cardData.description}`,
              },
            }
          : null,
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `🔰 Created by *${cardData.username}*`,
            },
          ],
        },
      ].filter(Boolean),
      text: `Card "${cardData.title}" created successfully`,
    })
    return response
  } catch (error) {
    showErrorToast(
      "Failed to send card creation message to Slack. Please try again later.",
    )
    throw error
  }
}

export async function POST(req) {
  try {
    const payload = await req.formData()
    const data = JSON.parse(payload.get("payload"))

    const slackIntegration = await prisma.slackIntegration.findFirst({
      where: {
        teamId: data.team.id,
        user: {
          email: {
            contains: data.user.username,
            mode: "insensitive",
          },
        },
      },
      select: {
        organizationName: true,
        accessToken: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })
    if (!slackIntegration) {
      return new Response(
        JSON.stringify({
          error: "No Slack integration found for this workspace",
          showToast: true,
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }
    const client = new WebClient(slackIntegration.accessToken)

    if (
      data.type === "shortcut" &&
      data.callback_id === "create_ticket_shortcut"
    ) {
      const boards = await getAllboards(
        data.user.username,
        slackIntegration?.organizationName,
      )

      const boardOptions = boards.map((board) => ({
        text: { type: "plain_text", text: board.name },
        value: board.id.toString(),
      }))

      await client.views.open({
        trigger_id: data.trigger_id,
        view: {
          type: "modal",
          callback_id: "create_ticket_modal",
          title: { type: "plain_text", text: "Create Card" },
          blocks: [
            {
              type: "input",
              block_id: "board_block",
              element: {
                type: "static_select",
                placeholder: { type: "plain_text", text: "Select a board" },
                options: boardOptions,
                action_id: "board_select",
              },
              label: { type: "plain_text", text: "Board" },
            },
          ],
          submit: { type: "plain_text", text: "Next" },
        },
      })

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    if (
      data.type === "message_action" &&
      data.callback_id === "create_ticket_shortcut"
    ) {
      const boards = await getAllboards(data.user.username)
      const boardOptions = boards.map((board) => ({
        text: { type: "plain_text", text: board.name },
        value: board.id.toString(),
      }))

      await client.views.open({
        trigger_id: data.trigger_id,
        view: {
          type: "modal",
          callback_id: "create_ticket_modal",
          title: { type: "plain_text", text: "Create Card" },
          blocks: [
            {
              type: "input",
              block_id: "board_block",
              element: {
                type: "static_select",
                placeholder: { type: "plain_text", text: "Select a board" },
                options: boardOptions,
                action_id: "board_select",
              },
              label: { type: "plain_text", text: "Board" },
            },
          ],
          submit: { type: "plain_text", text: "Next" },
        },
      })

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    if (data.type === "view_submission") {
      if (data.view.callback_id === "create_ticket_modal") {
        try {
          const { values } = data.view.state
          const selectedBoardId =
            values.board_block.board_select.selected_option.value
          const selectedBoardName =
            values.board_block.board_select.selected_option.text.text
          const [categories, labels, teams, users] = await Promise.all([
            showAllData(selectedBoardId),
            getLabels(parseInt(selectedBoardId, 10)),
            fetchTeams(selectedBoardId),
            fetchBoarduser(selectedBoardId),
          ])
          if (!categories || categories.length === 0) {
            return NextResponse.json({
              response_action: "errors",
              errors: {
                board_block:
                  "This board has no categories. Please select a different board.",
              },
            })
          }
          const modalBlocks = [
            {
              type: "input",
              block_id: "category_block",
              element: {
                type: "static_select",
                placeholder: { type: "plain_text", text: "Select category" },
                options: categories.map((cat) => ({
                  text: { type: "plain_text", text: cat.category },
                  value: cat.id.toString(),
                })),
                action_id: "category_select",
              },
              label: { type: "plain_text", text: "Category *" },
            },
            {
              type: "input",
              block_id: "title_block",
              element: {
                type: "plain_text_input",
                action_id: "title_input",
                placeholder: { type: "plain_text", text: "Enter card title" },
              },
              label: { type: "plain_text", text: "Title *" },
            },
            {
              type: "input",
              block_id: "description_block",
              optional: true,
              element: {
                type: "plain_text_input",
                multiline: true,
                action_id: "description_input",
                placeholder: { type: "plain_text", text: "Enter description" },
              },
              label: { type: "plain_text", text: "Description *" },
            },
          ]
          modalBlocks.push({
            type: "input",
            block_id: "priority_block",
            optional: true,
            element: {
              type: "static_select",
              options: [
                {
                  text: { type: "plain_text", text: "Highest" },
                  value: "highest",
                },
                { text: { type: "plain_text", text: "High" }, value: "high" },
                {
                  text: { type: "plain_text", text: "Medium" },
                  value: "medium",
                },
                { text: { type: "plain_text", text: "Low" }, value: "low" },
                {
                  text: { type: "plain_text", text: "Lowest" },
                  value: "lowest",
                },
              ],
              action_id: "priority_select",
            },
            label: { type: "plain_text", text: "Priority" },
          })
          if (Array.isArray(labels) && labels.length > 0) {
            modalBlocks.push({
              type: "input",
              block_id: "labels_block",
              optional: true,
              element: {
                type: "multi_static_select",
                placeholder: { type: "plain_text", text: "Select labels" },
                options: labels.map((label) => ({
                  text: { type: "plain_text", text: label.name },
                  value: label.id,
                })),
                action_id: "labels_select",
              },
              label: { type: "plain_text", text: "Labels" },
            })
          }
          if (Array.isArray(users) && users.length > 0) {
            modalBlocks.push({
              type: "input",
              block_id: "users_block",
              optional: true,
              element: {
                type: "multi_static_select",
                placeholder: { type: "plain_text", text: "Assign users" },
                options: users.map((user) => ({
                  text: { type: "plain_text", text: user.name },
                  value: user.id.toString(),
                })),
                action_id: "users_select",
              },
              label: { type: "plain_text", text: "Assign To" },
            })
          }
          if (Array.isArray(teams) && teams.length > 0) {
            modalBlocks.push({
              type: "input",
              block_id: "teams_block",
              optional: true,
              element: {
                type: "multi_static_select",
                placeholder: { type: "plain_text", text: "Assign teams" },
                options: teams.map((team) => ({
                  text: { type: "plain_text", text: team.name },
                  value: team.id.toString(),
                })),
                action_id: "teams_select",
              },
              label: { type: "plain_text", text: "Teams" },
            })
          }
          modalBlocks.push({
            type: "input",
            block_id: "due_date_block",
            optional: true,
            element: {
              type: "datepicker",
              action_id: "due_date_select",
            },
            label: { type: "plain_text", text: "Due Date" },
          })
          return NextResponse.json({
            response_action: "update",
            view: {
              type: "modal",
              callback_id: "create_ticket_final",
              private_metadata: JSON.stringify({
                boardName: selectedBoardName,
              }),
              title: { type: "plain_text", text: "Create Card" },
              blocks: modalBlocks,
              submit: { type: "plain_text", text: "Create" },
            },
          })
        } catch (error) {
          return NextResponse.json({
            response_action: "errors",
            errors: {
              board_block: "Failed to generate form. Please try again.",
            },
          })
        }
      }

      if (data.view.callback_id === "create_ticket_final") {
        try {
          const { values } = data.view.state
          const privateMetadata = JSON.parse(data.view.private_metadata || "{}")
          const { boardName } = privateMetadata
          const categoryId = parseInt(
            values.category_block.category_select.selected_option.value,
            10,
          )
          const title = values.title_block.title_input.value
          const description =
            values.description_block?.description_input?.value || ""
          const priority =
            values.priority_block?.priority_select?.selected_option?.value ||
            "medium"
          const selectedLabels =
            values.labels_block?.labels_select?.selected_options?.map(
              (opt) => opt.value,
            ) || []
          const selectedUsers =
            values.users_block?.users_select?.selected_options?.map((opt) =>
              parseInt(opt.value, 10),
            ) || []
          const dueDate = values.due_date_block?.due_date_select?.selected_date
          const selectedTeams =
            values.teams_block?.teams_select?.selected_options?.map((opt) =>
              parseInt(opt.value, 10),
            ) || []
          const teamNames =
            values.teams_block?.teams_select?.selected_options?.map(
              (opt) => opt.text.text,
            ) || []

          await createCardFromSlack({
            title,
            description,
            categoryId,
            priority,
            dueDate,
            labels: selectedLabels,
            assignedUsers: selectedUsers,
            teams: selectedTeams,
            username: data.user.name,
          })
          try {
            const conversationResponse = await client.conversations.open({
              users: data.user.id,
            })

            if (conversationResponse.ok) {
              await sendDetailedCardMessage(
                client,
                conversationResponse.channel.id,
                {
                  title,
                  description,
                  category:
                    values.category_block.category_select.selected_option.text
                      .text,
                  priority,
                  dueDate,
                  labels:
                    values.labels_block?.labels_select?.selected_options?.map(
                      (opt) => opt.text.text,
                    ) || [],
                  assignedUsers: selectedUsers,
                  teams: teamNames,
                  username: data.user.name,
                },
                boardName || "Unknown Board",
              )
            }
          } catch (slackError) {
            console.error("Slack messaging error:", slackError)
          }
          return new Response(
            JSON.stringify({
              response_action: "clear",
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        } catch (error) {
          return new Response(
            JSON.stringify({
              response_action: "errors",
              errors: {
                title_block: "Failed to create card. Please try again.",
              },
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        }
      }
    }
    return new Response(
      JSON.stringify({
        error: "Unsupported interaction type",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}

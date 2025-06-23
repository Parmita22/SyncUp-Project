import { NextResponse } from "next/server"
import { WebClient } from "@slack/web-api"

const userCache = {}

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1]
    const { searchParams } = new URL(req.url)
    const channel = searchParams.get("channel")

    if (!token || !channel) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      )
    }

    const client = new WebClient(token)
    const result = await client.conversations.history({
      channel,
      limit: 50,
    })

    if (!result.ok) {
      throw new Error(result.error || "Failed to fetch messages")
    }
    const fetchUserDetails = async (userId) => {
      if (userCache[userId]) {
        return userCache[userId]
      }

      const userResult = await client.users.info({ user: userId })

      if (!userResult.ok) {
        return { name: "Unknown", image: null }
      }

      const userDetails = {
        name: userResult.user.profile.real_name || userResult.user.name,
        image: userResult.user.profile.image_72,
      }

      userCache[userId] = userDetails
      return userDetails
    }

    const resolveMentions = async (text) => {
      const mentionRegex = /<@([A-Z0-9]+)>/g
      const linkRegex = /<([^|>]+)\|([^>]+)>/g
      const matches = [...text.matchAll(mentionRegex)]
      const replacements = await Promise.all(
        matches.map(async (match) => {
          const userId = match[1]
          const userDetails = await fetchUserDetails(userId)
          return { placeholder: match[0], name: userDetails.name || match[0] }
        }),
      )

      let resolvedText = text
      replacements.forEach(({ placeholder, name }) => {
        resolvedText = resolvedText.replace(placeholder, name)
      })
      resolvedText = resolvedText.replace(linkRegex, (_, url, displayText) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${displayText}</a>`
      })

      return resolvedText
    }
    const messages = await Promise.all(
      result.messages.map(async (msg) => {
        const userDetails = msg.user
          ? await fetchUserDetails(msg.user)
          : { name: "Unknown", image: null }
        const resolvedText = msg.text
          ? await resolveMentions(msg.text)
          : msg.text
        return {
          text: resolvedText,
          user: userDetails,
          ts: msg.ts,
        }
      }),
    )

    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

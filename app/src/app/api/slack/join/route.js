import { NextResponse } from "next/server"
import { WebClient } from "@slack/web-api"

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1]
    const { channel } = await req.json()

    if (!token || !channel) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      )
    }

    const client = new WebClient(token)
    try {
      await client.conversations.join({ channel })
    } catch (error) {
      if (error.data?.error !== "already_in_channel") {
        throw error
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error joining channel:", error)
    return NextResponse.json(
      {
        error: error.message,
        details: error.data,
      },
      { status: 500 },
    )
  }
}

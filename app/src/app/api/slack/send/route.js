import { NextResponse } from "next/server"
import { WebClient } from "@slack/web-api"

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1]
    const { channel, text } = await req.json()

    if (!token || !channel || !text) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      )
    }

    const client = new WebClient(token)
    await client.chat.postMessage({
      channel,
      text,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

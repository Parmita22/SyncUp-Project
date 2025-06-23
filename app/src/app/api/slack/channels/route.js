import { NextResponse } from "next/server"
import { WebClient } from "@slack/web-api"

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const client = new WebClient(token)
    const result = await client.conversations.list({
      exclude_archived: true,
      types: "public_channel",
    })

    return NextResponse.json({ channels: result.channels })
  } catch (error) {
    console.error("Error fetching channels:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

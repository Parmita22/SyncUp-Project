import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const organization = searchParams.get("organization")

  if (!organization) {
    return NextResponse.json(
      { error: "Organization is required" },
      { status: 400 },
    )
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = process.env.GITHUB_REDIRECT_URI
  const scopes = ["read:org", "user:email", "repo"].join(" ")
  const stateData = JSON.stringify({ id: uuidv4(), organization })

  const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(stateData)}`

  return NextResponse.redirect(githubOAuthUrl)
}

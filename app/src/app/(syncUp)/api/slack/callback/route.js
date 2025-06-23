import { WebClient } from "@slack/web-api"
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
export async function GET(req) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const [organization, email] = (state || "").split(":")
  try {
    if (!email) {
      return NextResponse.redirect(`${baseUrl}/integration?error=missing_email`)
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}/integration?error=user_not_found`,
      )
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/integration?error=missing_code`)
    }

    const client = new WebClient()
    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID?.trim(),
      client_secret: process.env.SLACK_CLIENT_SECRET?.trim(),
      code: code.trim(),
      redirect_uri: process.env.SLACK_REDIRECT_URI?.trim(),
    })

    const userInfo = await client.users.info({
      user: result.authed_user.id,
      token: result.access_token,
    })

    const userName =
      userInfo?.user?.profile?.real_name || userInfo?.user?.name || "Unknown"
    const existingIntegration = await prisma.slackIntegration.findFirst({
      where: {
        userId: user.id,
        workspaceId: result.team.id,
        organizationName: organization,
      },
    })

    if (existingIntegration) {
      await prisma.slackIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: result.access_token,
          teamName: result.team.name,
          userName,
          updatedAt: new Date(),
        },
      })
    } else {
      if (result.team.name !== organization) {
        return NextResponse.redirect(
          `${baseUrl}/${organization}/integration?error=${encodeURIComponent("Please authorize with correct workspace. Organization name and workspace name must match.")}`,
        )
      }
      await prisma.slackIntegration.create({
        data: {
          accessToken: result.access_token,
          workspaceId: result.team.id,
          teamId: result.team.id,
          teamName: result.team.name,
          organizationName: organization,
          userName,
          userId: user.id,
        },
      })
    }

    return NextResponse.redirect(
      `${baseUrl}/${organization}/integration?success=true`,
    )
  } catch (error) {
    const redirectPath = organization
      ? `${baseUrl}/${organization}/integration?error=${encodeURIComponent(error.message)}`
      : `${baseUrl}/integration?error=${encodeURIComponent(error.message)}`
    return NextResponse.redirect(redirectPath)
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(req) {
  if (req.method !== "POST") {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 })
  }

  const { code } = await req.json()
  try {
    const client = new WebClient()
    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI,
    })
    await prisma.slackIntegration.create({
      data: {
        accessToken: result.access_token,
        teamId: result.team.id,
        teamName: result.team.name,
        workspaceId: result.team.id,
        userId: req.user.id,
      },
    })
    const organization = result.team.name
    return NextResponse.redirect(
      new URL(`/${organization}/integration?success=true`, req.url),
    )
  } catch (error) {
    const organization = "unknown"
    return NextResponse.redirect(
      new URL(`/${organization}/integration?error=${error.message}`, req.url),
    )
  } finally {
    await prisma.$disconnect()
  }
}

import { Octokit } from "@octokit/rest"
import { NextResponse } from "next/server"
import prisma from "@/src/lib/prisma"

export async function GET(req) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/error?error=missing_params&message=Missing required parameters`,
    )
  }

  try {
    const stateData = JSON.parse(state)
    const { organization } = stateData

    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    )

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/${organization}/github/error?error=token_failed&organization=${organization}`,
      )
    }

    const octokit = new Octokit({ auth: tokenData.access_token })
    const { data: githubUser } = await octokit.request("/user")

    let userEmail = githubUser.email
    if (!userEmail) {
      const { data: emails } = await octokit.request("/user/emails")
      userEmail = emails.find((email) => email.primary && email.verified)?.email
    }

    if (!userEmail) {
      return NextResponse.redirect(
        `${baseUrl}/${organization}/github/error?error=no_email&organization=${organization}`,
      )
    }

    const { data: memberships } = await octokit.request(
      "GET /user/memberships/orgs",
    )
    const isMember = memberships.some(
      (membership) =>
        membership.organization.login === organization &&
        membership.state === "active",
    )

    if (!isMember) {
      return NextResponse.redirect(
        `${baseUrl}/${organization}/github/error?error=not_member&organization=${organization}`,
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}/${organization}/github/error?error=user_not_found&organization=${organization}`,
      )
    }

    await prisma.gitHubIntegration.upsert({
      where: {
        userId_githubUsername_organizationName: {
          userId: user.id,
          githubUsername: githubUser.login,
          organizationName: organization,
        },
      },
      create: {
        userId: user.id,
        githubUsername: githubUser.login,
        accessToken: tokenData.access_token,
        organizationName: organization,
      },
      update: {
        accessToken: tokenData.access_token,
      },
    })

    return NextResponse.redirect(
      `${baseUrl}/${organization}/github?success=true`,
    )
  } catch (error) {
    return NextResponse.redirect(
      `${baseUrl}/error?error=unexpected&message=${encodeURIComponent(error.message)}`,
    )
  }
}

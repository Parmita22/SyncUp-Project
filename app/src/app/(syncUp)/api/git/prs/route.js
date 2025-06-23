import { Octokit } from "@octokit/rest"
import { NextResponse } from "next/server"
import prisma from "@/src/lib/prisma"

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const repoId = searchParams.get("repoId")
  const owner = searchParams.get("owner")

  if (!userId || !repoId || !owner) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    )
  }

  try {
    const integration = await prisma.gitHubIntegration.findFirst({
      where: {
        userId: parseInt(userId, 10),
        organizationName: owner,
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: "GitHub integration not found" },
        { status: 404 },
      )
    }

    const octokit = new Octokit({ auth: integration.accessToken })

    try {
      const { data: pullRequests } = await octokit.pulls.list({
        owner,
        repo: repoId,
        state: "open",
        per_page: 100,
      })

      return NextResponse.json({
        pullRequests: pullRequests.map((pr) => ({
          id: pr.id,
          title: pr.title,
          number: pr.number,
          htmlUrl: pr.html_url,
          state: pr.state,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
        })),
      })
    } catch (error) {
      console.error("GitHub API Error:", {
        message: error.message,
        status: error.status,
        owner,
        repo: repoId,
      })

      if (error.status === 404) {
        return NextResponse.json(
          { error: "Repository not found or no access" },
          { status: 404 },
        )
      }
      throw error
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pull requests", details: error.message },
      { status: 500 },
    )
  }
}

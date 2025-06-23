import { Octokit } from "@octokit/rest"
import { NextResponse } from "next/server"
import prisma from "@/src/lib/prisma"
import { createboard } from "@/server/board"

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const userIdNum = parseInt(userId, 10)

  if (!userId || Number.isNaN(userIdNum)) {
    return NextResponse.json(
      { error: "Missing or invalid userId" },
      { status: 400 },
    )
  }

  try {
    const integration = await prisma.gitHubIntegration.findFirst({
      where: {
        userId: userIdNum,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            organizations: true,
          },
        },
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: "GitHub integration not found" },
        { status: 404 },
      )
    }
    const octokit = new Octokit({ auth: integration.accessToken })
    const repos = []
    try {
      const response = await octokit.rest.repos.listForOrg({
        org: integration.organizationName,
        type: "all",
        per_page: 100,
      })
      repos.push(...response.data)
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch GitHub repositories" },
        { status: error.status || 500 },
      )
    }
    const processedBoards = await Promise.all(
      repos.map(async (repo) => {
        try {
          const existingBoard = await prisma.board.findFirst({
            where: {
              name: repo.name,
              organization: {
                name: integration.organizationName,
              },
            },
            include: {
              users: true,
            },
          })

          if (existingBoard) {
            if (
              repo.private &&
              !existingBoard.users.some((u) => u.id === userIdNum)
            ) {
              await prisma.board.update({
                where: { id: existingBoard.id },
                data: {
                  users: {
                    connect: { id: userIdNum },
                  },
                },
              })
            }

            return {
              id: existingBoard.id,
              name: existingBoard.name,
              githubRepoId: repo.id,
              private: repo.private,
              htmlUrl: repo.html_url,
              isNew: false,
            }
          }

          const boardId = await createboard(
            repo.name,
            repo.private ? "PRIVATE" : "PUBLIC",
            "/backgrounds/image1.avif",
            [userIdNum],
            integration.organizationName,
            "GitHub",
          )

          return {
            id: boardId,
            name: repo.name,
            githubRepoId: repo.id,
            private: repo.private,
            htmlUrl: repo.html_url,
            isNew: true,
          }
        } catch (error) {
          console.error("Error processing repo:", repo.name, error)
          return null
        }
      }),
    )

    const boards = processedBoards.filter(Boolean)

    return NextResponse.json({
      boards,
      summary: {
        total: boards.length,
        new: boards.filter((b) => b.isNew).length,
        existing: boards.filter((b) => !b.isNew).length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process repositories", details: error.message },
      { status: 500 },
    )
  }
}

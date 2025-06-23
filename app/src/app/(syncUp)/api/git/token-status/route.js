import { NextResponse } from "next/server"
import prisma from "@/src/lib/prisma"

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")
  const organization = searchParams.get("organization")

  if (!email || !organization) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    )
  }

  try {
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        email,
        organizationName: organization,
      },
      include: {
        user: {
          include: {
            githubIntegrations: true,
          },
        },
      },
    })

    if (!userOrg) {
      return NextResponse.redirect(
        `/${organization}/github/error?error=org_mismatch&organization=${organization}`,
      )
    }

    const hasGitHubIntegration = userOrg.user.githubIntegrations.length > 0

    return NextResponse.json({
      hasToken: hasGitHubIntegration,
      organizationName: organization,
    })
  } catch (error) {
    console.error("Error checking token status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

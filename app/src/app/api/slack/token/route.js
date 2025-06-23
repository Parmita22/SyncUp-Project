import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { showErrorToast } from "@/src/utils/toastUtils"

const prisma = new PrismaClient()

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const organization = searchParams.get("organization")

    if (!email || !organization) {
      return NextResponse.json({
        connected: false,
        reason: "missing_parameters",
      })
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        slackIntegrations: {
          where: {
            organizationName: organization,
          },
          select: {
            accessToken: true,
            teamName: true,
          },
        },
      },
    })
    if (!user) {
      showErrorToast("User not found")
    }

    if (!user || !user.slackIntegrations?.[0]) {
      return NextResponse.json({ connected: false })
    }

    const integration = user.slackIntegrations[0]
    return NextResponse.json({
      connected: true,
      accessToken: integration.accessToken,
      teamName: integration.teamName,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      {
        status: 500,
      },
    )
  } finally {
    await prisma.$disconnect()
  }
}

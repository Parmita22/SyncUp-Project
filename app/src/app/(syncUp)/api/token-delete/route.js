import { NextResponse } from "next/server"
import prisma from "@/src/lib/prisma"

export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const organization = searchParams.get("organization")

  if (!userId || !organization) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    )
  }

  try {
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        user: {
          id: parseInt(userId, 10),
        },
        organizationName: organization,
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: "User does not belong to this organization" },
        { status: 403 },
      )
    }
    const result = await prisma.gitHubIntegration.deleteMany({
      where: {
        userId: parseInt(userId, 10),
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: "No GitHub integration found to delete" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "GitHub integration deleted successfully",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete token" },
      { status: 500 },
    )
  }
}

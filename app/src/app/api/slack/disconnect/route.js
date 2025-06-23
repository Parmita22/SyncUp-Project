import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req) {
  try {
    const { email, organization } = await req.json()

    if (!email || !organization) {
      return NextResponse.json(
        {
          error: "Email and organization required",
        },
        { status: 400 },
      )
    }

    await prisma.slackIntegration.deleteMany({
      where: {
        user: {
          email,
        },
        organizationName: organization,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

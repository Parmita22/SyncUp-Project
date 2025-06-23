import { NextResponse } from "next/server"
import prisma from "@/src/lib/prisma"

export async function GET(req, { params }) {
  const cardId = parseInt(params.id, 10)

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { name: true },
  })

  return NextResponse.json(card)
}

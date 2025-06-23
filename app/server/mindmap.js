"use server"

import prisma from "@/src/lib/prisma"

export const getMindMap = async (boardId) => {
  try {
    const mindMap = await prisma.mindMap.findUnique({
      where: { boardId },
    })
    return mindMap || { nodes: [], edges: [] }
  } catch (error) {
    throw new Error("Failed to fetch mind map")
  }
}

export const saveMindMap = async (boardId, nodes, edges) => {
  try {
    const mindMap = await prisma.mindMap.upsert({
      where: { boardId },
      update: { nodes, edges },
      create: { boardId, nodes, edges },
    })
    return mindMap
  } catch (error) {
    throw new Error("Failed to save mind map")
  }
}

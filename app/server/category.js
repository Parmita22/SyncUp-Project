"use server"

import prisma from "@/src/lib/prisma"

export const showAllData = async (boardId) => {
  const tasks = await prisma.task.findMany({
    where: {
      boardId: parseInt(boardId, 10),
    },
    orderBy: {
      order: "asc",
    },
  })
  return tasks
}

const validateCategoryName = async (
  categoryName,
  boardId,
  excludeTaskId = null,
) => {
  const excludedCategoryNames = [
    "Backlog",
    "Todo",
    "In Progress",
    "Done",
    "Release",
  ]
  if (excludedCategoryNames.includes(categoryName.trim())) {
    return { valid: false, error: "Cannot use a default category name." }
  }

  const existingCategories = await showAllData(boardId)
  const categoryExists = existingCategories.some((task) => {
    if (excludeTaskId && task.id === excludeTaskId) {
      return false
    }
    return (
      task.category.toLowerCase().trim() === categoryName.toLowerCase().trim()
    )
  })

  if (categoryExists) {
    return { valid: false, error: "Category already exists in this board" }
  }
  return { valid: true }
}
export const getCategoriesWithCardCount = async (boardId) => {
  try {
    const categories = await prisma.task.findMany({
      where: { boardId: parseInt(boardId, 10) },
      include: {
        cards: {
          select: {
            id: true,
          },
        },
      },
    })

    return categories.map((category) => ({
      id: category.id,
      title: category.category,
      cardCount: category.cards.length,
    }))
  } catch (error) {
    console.error("Error fetching categories with card count:", error)
    throw new Error("Failed to fetch categories with card count.")
  }
}
export const createTask = async (category, boardId, color) => {
  try {
    const validation = await validateCategoryName(category, boardId)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const newTask = await prisma.task.create({
      data: {
        category,
        boardId: parseInt(boardId, 10),
        color,
      },
    })
    return { success: true, task: newTask }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
export const createcategory = async (category, boardid, color) => {
  await prisma.task.create({
    data: {
      category,
      boardId: boardid,
      color,
    },
  })
}

export const updateCategory = async (category, taskid, color) => {
  await prisma.task.update({
    where: {
      id: parseInt(taskid, 10),
    },
    data: {
      category,
      color,
    },
  })
}

export const deleteCategory = async (taskId) => {
  const cardsToDelete = await prisma.card.findMany({
    where: {
      taskId: parseInt(taskId, 10),
    },
  })
  await Promise.all(
    cardsToDelete.map(async (card) => {
      await prisma.card.delete({
        where: {
          id: card.id,
        },
      })
    }),
  )
  await prisma.task.delete({
    where: {
      id: parseInt(taskId, 10),
    },
  })
}

export const editCategory = async (category, taskId) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId, 10) },
      select: { boardId: true },
    })

    if (!task) {
      return { success: false, error: "Category not found" }
    }
    const validation = await validateCategoryName(
      category,
      task.boardId,
      taskId,
    )
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    const updatedTask = await prisma.task.update({
      where: {
        id: parseInt(taskId, 10),
      },
      data: {
        category,
      },
    })
    return { success: true, task: updatedTask }
  } catch (error) {
    return { success: false, error: "Failed to update category" }
  }
}

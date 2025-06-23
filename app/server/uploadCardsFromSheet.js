"use server"

import { createTitle } from "./task"
import prisma from "@/src/lib/prisma"

const excelSerialToDate = (serial) => {
  const excelEpoch = new Date(1900, 0, 1)
  const daysOffset = serial > 59 ? serial - 2 : serial - 1
  return new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000)
}

const adjustDueDate = (dueDate) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (dueDate && dueDate < today) {
    return today
  }
  return dueDate
}

const checkDuplicateSrNum = async (srNumber, boardId) => {
  if (!srNumber) return false

  const existingCard = await prisma.card.findFirst({
    where: {
      srNumber,
      task: {
        boardId: parseInt(boardId, 10),
      },
    },
  })

  return !!existingCard
}

export const processSheetRows = async (rows, boardId, authorName) => {
  try {
    const headers = rows[0].map((h) => h?.toString().trim().toLowerCase())
    const requiredColumns = [
      "sr number",
      "issue",
      "card name",
      "priority",
      "category",
      "due date",
    ]
    const normalizedHeaders = headers.map((h) => h.toLowerCase())
    const missingColumns = requiredColumns.filter(
      (col) => !normalizedHeaders.includes(col.toLowerCase()),
    )
    if (missingColumns.length > 0) {
      return {
        success: false,
        error: `Missing columns: ${missingColumns.join(", ")}`,
      }
    }

    const categories = await prisma.task.findMany({
      where: { boardId: parseInt(boardId, 10) },
      select: { id: true, category: true },
    })
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.category.toLowerCase()] = cat.id
      return acc
    }, {})

    const errors = []
    let createdCount = 0
    const createdCards = []
    const rowsToProcess = rows.slice(1).map((row, i) => {
      const rowData = {
        srNumber: row[headers.indexOf("sr number")]?.toString().trim() || null,
        issue: row[headers.indexOf("issue")]?.toString().trim() || null,
        cardName: row[headers.indexOf("card name")]?.toString().trim(),
        priority:
          row[headers.indexOf("priority")]?.toString().trim().toLowerCase() ||
          "medium",
        category: row[headers.indexOf("category")]?.toString().trim(),
        dueDate: row[headers.indexOf("due date")],
        rowIndex: i + 1,
      }
      const rowErrors = []
      if (!rowData.cardName) {
        rowErrors.push(`Row ${rowData.rowIndex}: Missing Card Name`)
      }
      if (!rowData.category || !categoryMap[rowData.category.toLowerCase()]) {
        rowErrors.push(
          `Row ${rowData.rowIndex}: Invalid or missing Category '${rowData.category}'`,
        )
      }
      const validPriorities = ["highest", "high", "medium", "low", "lowest"]
      if (!rowData.priority || !validPriorities.includes(rowData.priority)) {
        rowErrors.push(
          `Row ${rowData.rowIndex}: Invalid Priority '${rowData.priority}'`,
        )
      }

      let parsedDueDate = null
      if (rowData.dueDate !== undefined && rowData.dueDate !== null) {
        if (typeof rowData.dueDate === "number") {
          parsedDueDate = excelSerialToDate(rowData.dueDate)
        } else {
          const date = new Date(rowData.dueDate)
          parsedDueDate = !Number.isNaN(date.getTime()) ? date : null
        }
        if (!parsedDueDate || Number.isNaN(parsedDueDate.getTime())) {
          parsedDueDate = new Date()
          parsedDueDate.setDate(parsedDueDate.getDate() + 7)
          rowErrors.push(
            `Row ${rowData.rowIndex}: Invalid Due Date '${rowData.dueDate}'. Set to 7 days from now.`,
          )
        }
      }
      rowData.dueDate = adjustDueDate(parsedDueDate)

      return { rowData, rowErrors }
    })

    await Promise.all(
      rowsToProcess.map(async ({ rowData, rowErrors }) => {
        if (rowErrors.length > 0) {
          errors.push(...rowErrors)
          return null
        }

        const isDuplicate = await checkDuplicateSrNum(rowData.srNumber, boardId)
        if (isDuplicate) {
          errors.push(` Card with this serial number already exists.`)
          return null
        }

        const taskId = categoryMap[rowData.category.toLowerCase()]
        try {
          const newCard = await prisma.$transaction(async (tx) => {
            const board = await tx.board.findUnique({
              where: { id: parseInt(boardId, 10) },
              include: { users: { select: { id: true } } },
            })
            if (!board) {
              throw new Error("Board not found")
            }
            const boardUserIds = board.users.map((user) => user.id)

            const description = rowData.issue
              ? JSON.stringify({
                  blocks: [
                    {
                      key: "issue",
                      text: rowData.issue,
                      type: "unstyled",
                      depth: 0,
                      inlineStyleRanges: [],
                      entityRanges: [],
                      data: {},
                    },
                  ],
                  entityMap: {},
                })
              : null

            const createdCard = await createTitle(
              {
                title: rowData.cardName,
                dueDate: rowData.dueDate,
                priority: rowData.priority,
                description,
                srNumber: rowData.srNumber,
                issue: rowData.issue,
              },
              taskId,
              boardUserIds,
              authorName,
            )
            return createdCard
          })
          createdCount += 1
          createdCards.push({
            ...newCard,
            taskId,
            status: "active",
            order: createdCount,
            label: [],
            assignedUsers: [],
            comments: [],
            attachments: [],
            checklistItems: [],
            blockers: [],
            blockedBy: [],
          })
          return null
        } catch (error) {
          errors.push(
            `Row ${rowData.rowIndex}: Failed to create card - ${error.message}`,
          )
          return null
        }
      }),
    )

    return {
      success: errors.length === 0,
      createdCount,
      errors,
      createdCards,
    }
  } catch (error) {
    console.error("Error processing sheet:", error)
    return {
      success: false,
      error: `Failed to process sheet: ${error.message}`,
      createdCards: [],
    }
  }
}

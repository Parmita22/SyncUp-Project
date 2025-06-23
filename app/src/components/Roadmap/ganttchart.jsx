"use client"

import React, { useEffect, useRef, useState } from "react"
import Gantt from "frappe-gantt"
import PropTypes from "prop-types"
import { showErrorToast } from "@/src/utils/toastUtils"
import GetSyncupData from "@/server/GetSyncupData"
import {
  updateTaskDates,
  getCardDependencies,
  getAllAssignedCards,
} from "@/server/task"
import CardDetailsModal from "./CardDetailsModal"
import { Role } from "@/src/roleManagement/roleManagement"

function GanttChart({ selectedBoardId, userRole, userEmail, isMyCardsView }) {
  const ganttContainer = useRef(null)
  const [roadmapData, setRoadmapData] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastShown, setToastShown] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isMyCardsView) {
          const organizationName = window.location.pathname.split("/")[1]
          const myCards = await getAllAssignedCards(userEmail, organizationName)
          setRoadmapData(myCards)
          return
        }

        const updatedData = await GetSyncupData(selectedBoardId)
        const dataWithDependencies = await Promise.all(
          updatedData.map(async (task) => {
            const filteredCards = task.cards.filter((card) => {
              if (card.status === "archived" || card.release === "RELEASED") {
                return false
              }
              if (userRole === Role.SuperAdmin || userRole === Role.Admin) {
                return true
              }
              return card.assignedUsers.some((user) => user.email === userEmail)
            })

            return {
              ...task,
              cards: await Promise.all(
                filteredCards.map(async (card) => {
                  const dependencies = await getCardDependencies(card.id)
                  return {
                    ...card,
                    dependencies: dependencies.blockers
                      .filter((blocker) => blocker.status !== "archived")
                      .map((blocker) => blocker.id.toString()),
                  }
                }),
              ),
            }
          }),
        )
        setRoadmapData(dataWithDependencies || [])
      } catch (error) {
        showErrorToast("Error fetching data:")
      }
    }
    fetchData()
  }, [selectedBoardId, userRole, userEmail, isMyCardsView])

  const formatDueDate = (dueDate) => {
    if (!dueDate) return ""
    const date = new Date(dueDate)
    return Number.isNaN(date.getTime()) ? "" : date.toDateString().slice(0, 15)
  }

  const formatDescription = (description) => {
    if (!description) return ""
    try {
      const parsedDescription = JSON.parse(description)
      return parsedDescription.blocks.map((block) => block.text).join("\n")
    } catch (error) {
      return ""
    }
  }

  useEffect(() => {
    if (!ganttContainer.current || !roadmapData.length) {
      ganttContainer.current.innerHTML = isMyCardsView
        ? "<div style='padding: 10px; text-align: center;'>No cards assigned to you.</div>"
        : userRole === Role.User
          ? "<div style='padding: 10px; text-align: center;'>No cards are currently assigned to you in this board.</div>"
          : "<div style='padding: 10px; text-align: center;'>There are no cards in this board.</div>"
      return
    }

    const generateRandomColor = () => {
      return `#${Math.floor(Math.random() * 16777215).toString(16)}`
    }
    const mappedCards = roadmapData.flatMap((task) =>
      task.cards.map((card) => ({
        id: card.id?.toString() || `task-${Math.random()}`,
        name: card.name || "Untitled Task",
        start: card.createdAt
          ? new Date(card.createdAt).toISOString().slice(0, 10)
          : "2025-01-01",
        end: card.dueDate
          ? new Date(card.dueDate).toISOString().slice(0, 10)
          : "2025-12-31",
        dependencies: card.dependencies || "",
        description: formatDescription(card.description),
        dueDate: formatDueDate(card.dueDate),
        custom_class: `gantt-task-${card.id || Math.random()}`,
        color: card.taskColor || generateRandomColor(),
        isCompleted: card.isCompleted,
      })),
    )

    if (mappedCards.length === 0) {
      ganttContainer.current.innerHTML =
        userRole === Role.User
          ? "<div style='padding: 10px; text-align: center;'>No cards are currently assigned to you in this board.</div>"
          : "<div style='padding: 10px; text-align: center;'>There are no cards in this board.</div>"
      return
    }
    ganttContainer.current.innerHTML = ""

    const updateGantt = () => {
      if (!ganttContainer.current) return
      const gantt = new Gantt(ganttContainer.current, mappedCards, {
        on_click: (task) => {
          const card = roadmapData
            .flatMap((t) => t.cards)
            .find((c) => c.id.toString() === task.id)
          if (card?.isCompleted) {
            showErrorToast(
              "The card is marked as completed and cannot be updated.",
            )
            return
          }
          if (card) {
            setSelectedCard(card)
            setIsModalOpen(true)
          }
        },
        on_date_change: async (task, start, end) => {
          const card = roadmapData
            .flatMap((t) => t.cards)
            .find((c) => c.id.toString() === task.id)
          if (card.isCompleted) {
            if (!toastShown) {
              showErrorToast(
                "The card is marked as completed and cannot be updated.",
              )
              setToastShown(true)
            }
            return
          }
          try {
            await updateTaskDates({
              taskId: task.id,
              startDate: start,
              endDate: end,
            })
          } catch (error) {
            showErrorToast("Error updating task dates.")
          }
        },
        arrow_curve: 34,
        dependencies_enabled: true,
        bar_height: 35,
        padding: 20,
        view_modes: ["Day", "Week", "Month"],
      })

      gantt.change_view_mode("Week")
      const arrows = document.querySelectorAll(".arrow")
      arrows.forEach((arrow) => {
        const arrowElement = arrow
        arrowElement.style.stroke = "#666"
        arrowElement.style.strokeWidth = "2"
        arrowElement.style.markerEnd = "url(#arrowhead)"
      })
      mappedCards.forEach((card) => {
        const labelElement = document.querySelector(
          `.gantt-task-${card.id} text`,
        )
        if (labelElement) {
          labelElement.style.fill = "#000"
          labelElement.style.fontWeight = "500"
          labelElement.style.fontSize = "14px"
        }
        const taskElement = document.querySelector(
          `.gantt-task-${card.id} .bar`,
        )
        if (taskElement) {
          taskElement.style.fill = card.color || "#7754bd"
          taskElement.style.stroke = "#333"
          taskElement.style.strokeWidth = "1px"
          taskElement.style.rx = "4"
          taskElement.style.ry = "4"
          if (card.isCompleted) {
            taskElement.style.pointerEvents = "none"
          }
        }
      })
    }
    requestAnimationFrame(updateGantt)
  }, [roadmapData, isMyCardsView, userRole])

  return (
    <>
      <div
        ref={ganttContainer}
        style={{
          overflowX: "auto",
          whiteSpace: "nowrap",
          padding: "10px",
          maxWidth: "75vw",
        }}
      />
      {selectedCard && (
        <CardDetailsModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}

GanttChart.propTypes = {
  selectedBoardId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  userRole: PropTypes.oneOf(Object.values(Role)),
  userEmail: PropTypes.string,
  isMyCardsView: PropTypes.bool,
}
GanttChart.defaultProps = {
  selectedBoardId: null,
  userRole: Role.User,
  userEmail: "",
  isMyCardsView: false,
}

export default GanttChart

"use client"

import React, { useState, useEffect } from "react"
import { Card, CardBody, Progress, Tooltip } from "@heroui/react"
import { MdOutlinePublic } from "react-icons/md"
import { BiSolidLock } from "react-icons/bi"
import { useTheme } from "next-themes"
import { useSession } from "next-auth/react"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"
import GanttChart from "./ganttchart"
import GetSyncupData from "@/server/GetSyncupData"

export default function RoadmapUI() {
  const { boardData, userInfo } = useGlobalSyncupContext()
  const [selectedBoard, setSelectedBoard] = useState(null)
  const [boardProgress, setBoardProgress] = useState({})
  const [isMyCardsView, setIsMyCardsView] = useState(false)
  const { resolvedTheme } = useTheme()
  const { data: session } = useSession()
  const userEmail = session?.user?.email

  const handleBoardClick = (boardId) => {
    setSelectedBoard((prev) => (prev === boardId ? null : boardId))
    setIsMyCardsView(false)
  }

  const handleMyCardsClick = () => {
    setIsMyCardsView(true)
    setSelectedBoard("my-cards")
  }

  useEffect(() => {
    const fetchBoardProgress = async () => {
      const progressData = {}
      const progressPromises = boardData.map(async (board) => {
        const data = await GetSyncupData(board.id)
        const totalProgress = data.reduce((acc, task) => {
          const taskProgress = task.cards.reduce(
            (taskAcc, card) => taskAcc + (card.progress || 0),
            0,
          )
          return acc + taskProgress
        }, 0)
        const totalCards = data.reduce(
          (acc, task) => acc + task.cards.length,
          0,
        )
        progressData[board.id] = totalCards ? totalProgress / totalCards : 0
      })
      await Promise.all(progressPromises)
      setBoardProgress(progressData)
    }

    fetchBoardProgress()
  }, [boardData])

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100vh",
        overflow: "auto",
        scrollbarWidth: "none",
      }}
    >
      {boardData.length === 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "75%",
            borderRadius: "12px",
            border: "1px solid #e0e0e0",
            backgroundColor: resolvedTheme === "dark" ? "#333" : "white",
            margin: "20px 10px",
          }}
        >
          <p
            style={{
              textAlign: "center",
              fontSize: "1rem",
              fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace"',
              color: resolvedTheme === "dark" ? "#fff" : "#000",
            }}
          >
            No boards are present.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{ display: "flex", marginRight: "10px", minWidth: "230px" }}
          >
            <Card
              style={{
                borderRadius: "12px",
                height: "89vh",
                marginLeft: "17px",
                marginTop: "12px",
                marginRight: "2px",
                backgroundColor: resolvedTheme === "dark" ? "#444" : "white",
                color: resolvedTheme === "dark" ? "#fff" : "#000",
              }}
            >
              <CardBody className="no-scrollbar">
                <div>
                  <div style={{ width: "95%", marginBottom: "15px" }}>
                    <Card
                      isHoverable
                      isPressable
                      onClick={handleMyCardsClick}
                      style={{
                        borderRadius: "12px",
                        height: "98%",
                        marginLeft: "10px",
                        padding: "5px",
                        backgroundColor: isMyCardsView
                          ? resolvedTheme === "dark"
                            ? "#555"
                            : "#e0e0e0"
                          : resolvedTheme === "dark"
                            ? "#444"
                            : "white",
                        color: resolvedTheme === "dark" ? "#fff" : "#000",
                        width: "200px",
                        borderLeft: "4px solid #7828c8",
                      }}
                    >
                      <CardBody className="no-scrollbar">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <p
                            style={{
                              marginLeft: "8px",
                              flex: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontWeight: "600",
                            }}
                          >
                            My Cards
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                  {boardData.map((board) => (
                    <div
                      key={board.id}
                      style={{ width: "95%", marginBottom: "10px" }}
                    >
                      <Card
                        isHoverable
                        isPressable
                        onClick={() => handleBoardClick(board.id)}
                        style={{
                          borderRadius: "12px",
                          height: "98%",
                          marginLeft: "10px",
                          padding: "5px",
                          backgroundColor:
                            selectedBoard === board.id
                              ? resolvedTheme === "dark"
                                ? "#555"
                                : "#e0e0e0"
                              : resolvedTheme === "dark"
                                ? "#444"
                                : "white",
                          color: resolvedTheme === "dark" ? "#fff" : "#000",
                          width: "200px",
                        }}
                      >
                        <CardBody className="no-scrollbar">
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <p
                              style={{
                                marginLeft: "8px",
                                flex: 1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {board.name}
                            </p>
                            <Tooltip
                              content={
                                board.visibility === "PUBLIC"
                                  ? "Public Board"
                                  : "Private Board"
                              }
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  right: 0,
                                  zIndex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "0 10px 0 0",
                                  width: "25px",
                                  height: "25px",
                                  color: "#606060",
                                }}
                              >
                                {board.visibility === "PUBLIC" ? (
                                  <MdOutlinePublic className="text-[#7754bd]" />
                                ) : (
                                  <BiSolidLock
                                    size={80}
                                    className="text-[#7754bd]"
                                  />
                                )}
                              </div>
                            </Tooltip>
                          </div>
                          <p className="text-xs mt-2">
                            {boardProgress[board.id] === 100
                              ? "Completed"
                              : "In Progress"}
                          </p>
                          <Progress
                            aria-label="Loading..."
                            value={boardProgress[board.id] || 0}
                            className="max-w-md mt-2"
                            color="secondary"
                          />
                        </CardBody>
                      </Card>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
          <div
            style={{
              flex: "1 1 70%",
              marginTop: "12px",
              marginRight: "15px",
              minWidth: "600px",
            }}
          >
            {selectedBoard && (
              <Card
                style={{
                  borderRadius: "12px",
                  height: "89vh",
                  backgroundColor: resolvedTheme === "dark" ? "#444" : "white",
                  color: resolvedTheme === "dark" ? "#fff" : "#000",
                }}
              >
                <CardBody className="no-scrollbar">
                  <GanttChart
                    selectedBoardId={selectedBoard}
                    userRole={userInfo.role}
                    userEmail={userEmail}
                    isMyCardsView={isMyCardsView}
                  />
                </CardBody>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}

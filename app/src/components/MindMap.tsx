"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  CircularProgress,
  Button,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react"
import PropTypes from "prop-types"
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  addEdge,
  getBezierPath,
  MarkerType,
} from "@xyflow/react"
// eslint-disable-next-line import/no-extraneous-dependencies
import "@xyflow/react/dist/style.css"

import { MdOutlineDeleteSweep } from "react-icons/md"
import { showErrorToast } from "@/src/utils/toastUtils"
import { getAllCardsOnBoard, getCardDependencies } from "@/server/task"
import { getMindMap, saveMindMap } from "@/server/mindmap"

type CustomEdgeProps = {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  data: {
    onDelete: (id: string) => void
    theme: string
  }
}

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: CustomEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <path id={id} className="react-flow__edge-path" d={edgePath} />
      <foreignObject
        width={40}
        height={40}
        x={labelX - 20}
        y={labelY - 20}
        style={{ overflow: "visible", cursor: "pointer" }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            data.onDelete(id)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation()
              data.onDelete(id)
            }
          }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "24px",
            height: "24px",
            color: data.theme === "dark" ? "#fff" : "#000",
            fontSize: "16px",
            opacity: 0,
            transition: "opacity 0.2s",
          }}
          className="delete-icon"
        >
          <MdOutlineDeleteSweep />
        </div>
      </foreignObject>
      <style>
        {`
          .delete-icon:hover {
            opacity: 1 !important;
          }
          .react-flow__edge:hover .delete-icon {
            opacity: 1;
          }
        `}
      </style>
    </>
  )
}
function CustomNode({ data }) {
  return (
    <div
      style={{
        background: data.theme === "dark" ? "#333" : "#fff",
        color: data.theme === "dark" ? "#fff" : "#000",
        border: "1px solid #777",
        borderRadius: "4px",
        padding: "10px",
        width: 150,
        textAlign: "center",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#555" }}
      />
      <div>{data.label}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#555" }}
      />
    </div>
  )
}

CustomNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string.isRequired,
    theme: PropTypes.string.isRequired,
  }).isRequired,
}
const edgeTypes = {
  custom: CustomEdge,
}
function MindMap({ theme, onClose, boardId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cards, setCards] = useState([])
  const [selectedCardIds, setSelectedCardIds] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [edgeToDelete, setEdgeToDelete] = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const loadState = async () => {
      try {
        const { nodes: savedNodes, edges: savedEdges } =
          await getMindMap(boardId)
        const boardCards = await getAllCardsOnBoard(boardId)
        if (boardCards.error) {
          showErrorToast("Failed to fetch board cards for validation")
          return
        }
        const validCardIds = new Set(
          boardCards.map((card) => `card-${card.id}`),
        )
        const validNodes = savedNodes.filter((node) =>
          validCardIds.has(node.id),
        )
        const validEdges = savedEdges.filter(
          (edge) =>
            edge.source &&
            edge.target &&
            validNodes.some((node) => node.id === edge.source) &&
            validNodes.some((node) => node.id === edge.target),
        )
        setNodes(
          validNodes.map((node) => ({
            ...node,
            type: "custom",
            data: { ...node.data, theme },
          })),
        )
        setEdges(
          validEdges.map((edge) => ({
            ...edge,
            style: {
              stroke: theme === "dark" ? "#fff" : "#000000",
              strokeWidth: 2,
            },
          })),
        )
      } catch (error) {
        showErrorToast("Error loading mind map state:")
      }
    }
    loadState()
  }, [boardId, setNodes, setEdges, theme])

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        style: {
          stroke: theme === "dark" ? "#fff" : "#000000",
          strokeWidth: 2,
        },
      })),
    )
  }, [theme, setEdges])

  useEffect(() => {
    const validEdges = edges.filter(
      (edge) =>
        edge.source &&
        edge.target &&
        nodes.some((node) => node.id === edge.source) &&
        nodes.some((node) => node.id === edge.target),
    )
    if (validEdges.length < edges.length) {
      setEdges(validEdges)
    }
  }, [nodes, edges, setEdges])

  const fetchCards = async () => {
    setLoading(true)
    try {
      const boardCards = await getAllCardsOnBoard(boardId)
      if (boardCards.error) {
        showErrorToast(boardCards.error)
        return
      }
      const existingCardIds = nodes.map((node) =>
        parseInt(node.id.replace("card-", ""), 10),
      )
      setSelectedCardIds(existingCardIds)

      setCards(boardCards)
    } catch (error) {
      showErrorToast("Failed to fetch cards")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCardsClick = () => {
    setIsModalOpen(true)
    fetchCards()
  }

  const handleCardSelection = (cardId) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        setNodes((nds) => nds.filter((node) => node.id !== `card-${cardId}`))
        setEdges((eds) =>
          eds.filter(
            (edge) =>
              edge.source !== `card-${cardId}` &&
              edge.target !== `card-${cardId}`,
          ),
        )
        return prev.filter((id) => id !== cardId)
      }
      return [...prev, cardId]
    })
  }
  const handleConfirmSelection = async () => {
    const selectedCards = cards.filter((card) =>
      selectedCardIds.includes(card.id),
    )

    const existingNodeMap = new Map(nodes.map((node) => [node.id, node]))

    const newNodes = selectedCards.map((card, index) => {
      const nodeId = `card-${card.id}`
      if (existingNodeMap.has(nodeId)) {
        return {
          ...existingNodeMap.get(nodeId),
          data: {
            ...existingNodeMap.get(nodeId).data,
            label: card.name,
            theme,
          },
        }
      }
      return {
        id: nodeId,
        type: "custom",
        position: {
          x: 50 + (index % 3) * 150,
          y: 50 + Math.floor(index / 3) * 100,
        },
        data: { label: card.name, theme },
      }
    })
    const newEdges = []
    const validCardIds = new Set(selectedCards.map((card) => card.id))
    await Promise.all(
      selectedCards.map(async (card) => {
        try {
          const dependencies = await getCardDependencies(card.id)
          if (dependencies.error) {
            showErrorToast(dependencies.error)
            return
          }
          dependencies.blockers
            .filter((blocker) => validCardIds.has(blocker.id))
            .forEach((blocker) => {
              const sourceId = `card-${blocker.id}`
              const targetId = `card-${card.id}`
              newEdges.push({
                id: `edge-${blocker.id}-${card.id}`,
                source: sourceId,
                target: targetId,
                type: "smoothstep",
                style: {
                  stroke: theme === "dark" ? "#fff" : "#000000",
                  strokeWidth: 2,
                },
                markerEnd: { type: "arrowclosed" },
              })
            })
          dependencies.blockedBy
            .filter((blocked) => validCardIds.has(blocked.id))
            .forEach((blocked) => {
              const sourceId = `card-${card.id}`
              const targetId = `card-${blocked.id}`
              newEdges.push({
                id: `edge-${card.id}-${blocked.id}`,
                source: sourceId,
                target: targetId,
                type: "smoothstep",
                style: {
                  stroke: theme === "dark" ? "#fff" : "#000000",
                  strokeWidth: 2,
                },
                markerEnd: { type: "arrowclosed" },
              })
            })
        } catch (error) {
          showErrorToast(`Failed to fetch dependencies for card: ${card.name}`)
        }
      }),
    )
    setNodes((nds) => {
      const updatedNodes = [...nds, ...newNodes]
      const validEdges = newEdges.filter(
        (edge) =>
          updatedNodes.some((node) => node.id === edge.source) &&
          updatedNodes.some((node) => node.id === edge.target),
      )
      setEdges((eds) => {
        const updatedEdges = [...eds, ...validEdges]
        const uniqueEdges = Array.from(
          new Map(updatedEdges.map((edge) => [edge.id, edge])).values(),
        )
        return uniqueEdges
      })
      return updatedNodes
    })

    setIsModalOpen(false)
    setSelectedCardIds([])
  }

  const onConnect = useCallback(
    (params) => {
      if (params.source === params.target) {
        showErrorToast("Cannot connect a node to itself")
        return
      }
      const newEdge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: "smoothstep",
        style: {
          stroke: theme === "dark" ? "#fff" : "#000000",
          strokeWidth: 2,
        },
        markerEnd: { type: MarkerType.ArrowClosed },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, theme],
  )

  const handleClose = async () => {
    try {
      const validEdges = edges.filter(
        (edge) =>
          edge.source &&
          edge.target &&
          nodes.some((node) => node.id === edge.source) &&
          nodes.some((node) => node.id === edge.target),
      )
      await saveMindMap(boardId, nodes, validEdges)
    } catch (error) {
      throw error("Error saving mind map state:", error)
    }
    onClose()
  }
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor:
          theme === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)",
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "1200px",
          height: "80vh",
          margin: "40px auto",
          background: theme === "dark" ? "#222" : "#fff",
          border: "1px solid #ccc",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <style>
          {`
            .mindmap-controls .react-flow__controls-button {
              background: ${theme === "dark" ? "#000" : "#fff"};
            }
            .mindmap-controls .react-flow__controls-button svg {
              fill: ${theme === "dark" ? "#fff" : "#333"};
              stroke: ${theme === "dark" ? "#fff" : "#333"};
            }
            .mindmap-controls .react-flow__controls-button:hover svg {
              fill: ${theme === "dark" ? "#ccc" : "#000"};
              stroke: ${theme === "dark" ? "#ccc" : "#000"};
            }
          `}
        </style>
        <div
          className="mindmap-controls"
          style={{ width: "100%", height: "100%" }}
        >
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges.map((edge) => ({
                ...edge,
                type: "custom",
                data: {
                  onDelete: (id) => {
                    setEdgeToDelete(id)
                    setIsDeleteModalOpen(true)
                  },
                  theme,
                },
              }))}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={{ custom: CustomNode }}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              style={{ width: "100%", height: "100%" }}
            >
              <Background />
              <Controls />
            </ReactFlow>

            <Modal
              isOpen={isDeleteModalOpen}
              onOpenChange={() => setIsDeleteModalOpen(!isDeleteModalOpen)}
              style={{ zIndex: 9999 }}
            >
              <ModalContent>
                {() => (
                  <>
                    <ModalHeader className="flex flex-col gap-1">
                      Delete Connection
                    </ModalHeader>
                    <ModalBody>
                      <p>Are you sure you want to delete this connection?</p>
                      <p>This action cannot be undone.</p>
                    </ModalBody>
                    <ModalFooter>
                      <Button
                        color="secondary"
                        variant="light"
                        onPress={() => {
                          setIsDeleteModalOpen(false)
                          setEdgeToDelete(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="danger"
                        onPress={() => {
                          setEdges((eds) =>
                            eds.filter((edge) => edge.id !== edgeToDelete),
                          )
                          setIsDeleteModalOpen(false)
                          setEdgeToDelete(null)
                        }}
                      >
                        Delete
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
          </ReactFlowProvider>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "12px",
            zIndex: 101,
          }}
        >
          <Button
            className="text-[#fefefe] dark:text-black"
            style={{
              backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
              padding: "10px 20px",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              transition: "background-color 0.2s, transform 0.1s",
            }}
            onClick={handleAddCardsClick}
          >
            Add Cards
          </Button>
          <Button
            className="text-[#fefefe] dark:text-black"
            style={{
              backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
              padding: "10px 20px",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              transition: "background-color 0.2s, transform 0.1s",
            }}
            onClick={() => {
              localStorage.removeItem(`mindmap-${boardId}`)
              setNodes([])
              setEdges([])
            }}
          >
            Clear Mind Map
          </Button>
          <Button
            className="text-[#fefefe] dark:text-black"
            style={{
              backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
              padding: "10px 20px",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              transition: "background-color 0.2s, transform 0.1s",
            }}
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="xl"
        backdrop="blur"
        style={{
          background: theme === "dark" ? "#333" : "#fff",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
          padding: "16px",
        }}
      >
        <ModalContent>
          <ModalHeader
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: theme === "dark" ? "#fff" : "#000",
              paddingBottom: "8px",
              borderBottom: `1px solid ${theme === "dark" ? "#555" : "#ddd"}`,
            }}
          >
            Select Cards
          </ModalHeader>
          <ModalBody
            style={{
              maxHeight: "450px",
              overflowY: "auto",
              padding: "16px",
            }}
          >
            {loading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <CircularProgress style={{ color: "#ed7620" }} />
                <p
                  style={{
                    marginTop: "8px",
                    color: theme === "dark" ? "#ccc" : "#666",
                  }}
                >
                  Loading cards...
                </p>
              </div>
            ) : cards.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: theme === "dark" ? "#ccc" : "#666",
                  fontSize: "1rem",
                }}
              >
                No cards available on this board.
              </p>
            ) : (
              cards.map((card) => (
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    margin: "4px 0",
                    border: `1px solid ${theme === "dark" ? "#444" : "#eee"}`,
                    borderRadius: "6px",
                    background: theme === "dark" ? "#3a3a3a" : "#f9f9f9",
                    transition: "background 0.2s",
                    cursor: "pointer",
                  }}
                  onClick={() => handleCardSelection(card.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleCardSelection(card.id)
                    }
                  }}
                >
                  <Checkbox
                    isSelected={selectedCardIds.includes(card.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleCardSelection(card.id)
                    }}
                    style={{ marginRight: "12px" }}
                  />
                  <span
                    style={{
                      fontWeight: "500",
                      color: theme === "dark" ? "#fff" : "#000",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {card.name}
                  </span>
                </div>
              ))
            )}
          </ModalBody>
          <ModalFooter
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              paddingTop: "8px",
              borderTop: `1px solid ${theme === "dark" ? "#555" : "#ddd"}`,
            }}
          >
            <Button
              color="danger"
              variant="flat"
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                transition: "background 0.2s",
              }}
            >
              Cancel
            </Button>
            <Button
              className="text-[#fefefe] dark:text-black"
              onClick={handleConfirmSelection}
              isDisabled={selectedCardIds.length === 0}
              style={{
                backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
                padding: "10px 20px",
                borderRadius: "6px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                transition: "background-color 0.2s, transform 0.1s",
              }}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

MindMap.propTypes = {
  theme: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  boardId: PropTypes.number.isRequired,
}

export default MindMap

/* eslint-disable jsx-a11y/label-has-associated-control */

"use client"

import React, { useEffect, useState } from "react"
import { Draggable, DropResult, Droppable } from "react-beautiful-dnd"
import { Box, Stack, useMediaQuery } from "@mui/material"
import {
  CircularProgress,
  Card,
  CardHeader,
  CardBody,
  Button,
  Avatar,
  AvatarGroup,
  Badge,
  Tooltip,
  Input,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
} from "@heroui/react"
import { MdAdd } from "react-icons/md"
import { RiMindMap } from "react-icons/ri"
import PropTypes from "prop-types"
import AttachmentIcon from "@mui/icons-material/Attachment"
import InsertCommentIcon from "@mui/icons-material/InsertComment"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useParams, useRouter } from "next/navigation"
import { FaLink } from "react-icons/fa"
import { TbChecklist } from "react-icons/tb"
import { useSession } from "next-auth/react"
import { IoMdFlash } from "react-icons/io"
import MindMap from "./MindMap"
import { getPriorityIcon } from "@/src/utils/priorityUtlis"

import { showSuccessToast, showErrorToast } from "@/src/utils/toastUtils"
import Loader from "./Loader"
import CardOption from "./CardOption"
import {
  updateCardPositionInDB,
  moveCardToList,
} from "@/server/UpdateCardOrder"
import { createTitle, updateTaskProgress, cardTeams } from "@/server/task"
import { createTask, editCategory } from "@/server/category"
import { useGlobalSyncupContext } from "../context/SyncUpStore"
import CategoryOptions from "./CategoryOptions"
import GetSyncupData from "../../server/GetSyncupData"
import View from "./View"
import { updateBoard } from "@/server/board"
import DndContext from "../context/DndContext"
import {
  releaseVersion,
  archiveCards,
  getUnreleasedVersions,
} from "@/server/version"

export const excludedCategory = [
  "Backlog",
  "Todo",
  "In Progress",
  "Done",
  "Release",
]
function Cards({ boardId }) {
  const {
    data,
    setData,
    setLoad,
    load,
    categoryLoad,
    setCategoryLoad,
    TableView,
    boardData,
    setcreatenotification,
    setupdate,
    defaultload,
    setDefaultLoad,
    setudpateboard,
    selectedCards,
    setSelectedCards,
  } = useGlobalSyncupContext()
  const router = useRouter()
  const orgname = useParams()
  const { theme } = useTheme()
  const [id, setId] = useState<number>(null)
  const [inputfeild, showInput] = useState(false)
  const [categoryedit, setcategory] = useState(false)
  const [flag, setFlag] = useState(true)
  const [newListInput, setNewListInput] = useState("")
  const isSmallScreen = useMediaQuery("(max-width: 400px)")
  const [inputFieldVisible, setInputFieldVisible] = useState(false)
  const [boarduser, setboarduser] = useState([])
  const [assignedTeams, setAssignedTeams] = useState({})
  const [isMindMapOpen, setIsMindMapOpen] = useState(false)
  const [showCategoryCheckbox] = useState(false)
  const [hoveredCategoryId] = useState<number | null>(null)
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null)
  const { data: session } = useSession()
  const [name, setName] = useState("")
  const [isInsideBoard] = useState(true)
  const excludedCategory = ["Backlog", "Todo", "In Progress", "Done", "Release"]
  const userName = session?.user?.name
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [releaseCards, setReleaseCards] = useState([])
  const [unreleasedVersions, setUnreleasedVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState("")
  const isSmallViewport = useMediaQuery("(max-width: 617px)")

  const handleCardRowClick = (cardid) => {
    router.push(`/${orgname.organization}/board/${boardId}/${cardid.id}`)
  }

  const handleMindMapToggle = () => {
    setIsMindMapOpen((prev) => !prev)
  }

  const fetchboard = async () => {
    const board = boardData.map((boards) => boards.users)
    const userIds = board.flat().map((user) => user.id)
    setboarduser(userIds)
  }
  const fetchBoardData = async () => {
    try {
      const updatedData = await GetSyncupData(boardId)
      setData(updatedData)
      const teamAssignments = {}
      await Promise.all(
        updatedData.flatMap((category) =>
          category.cards.map(async (card) => {
            if (card?.id) {
              const teams = await cardTeams({ updateId: card.id })
              teamAssignments[card.id] = teams || []
            }
          }),
        ),
      )
      setAssignedTeams(teamAssignments)
    } catch (error) {
      showErrorToast("Error fetching data")
    } finally {
      setLoad(false)
      setCategoryLoad(false)
    }
  }

  const fetchUnreleasedVersions = async () => {
    const orgId = boardData[0]?.organizationId
    if (!orgId) return []
    try {
      const versions = await getUnreleasedVersions(orgId)
      return versions
    } catch (error) {
      showErrorToast("Failed to fetch unreleased versions")
      return []
    }
  }

  const handleReleaseCheck = async () => {
    if (selectedCards.length === 0) {
      showErrorToast("Please select at least one card to release")
      setIsModalOpen(false)
      return
    }

    const versions = await fetchUnreleasedVersions()
    setUnreleasedVersions(versions)
    setReleaseCards(selectedCards)
    if (versions.length > 0) {
      setSelectedVersionId("")
      setIsModalOpen(true)
    } else {
      showErrorToast("Please create a version to release")
      setIsModalOpen(false)
    }
  }

  const handleRelease = async (versionId) => {
    if (!versionId) {
      showErrorToast("Please select a version")
      return
    }
    const released = await releaseVersion(releaseCards, versionId)
    if (released) {
      await archiveCards(releaseCards)
      await fetchBoardData()
      showSuccessToast(
        "You have successfully released and archived the version",
      )
      setIsModalOpen(false)
      setSelectedVersionId("")
      setSelectedCards([])
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    const newData = [...data]
    const sourceIndex = source.index
    const destIndex = destination.index

    if (source.droppableId === destination.droppableId) {
      const droppableIndex = parseInt(
        destination.droppableId.replace("droppable", ""),
        10,
      )
      const task = newData[droppableIndex]
      const [movedCard] = task.cards.splice(sourceIndex, 1)
      task.cards.splice(destIndex, 0, movedCard)

      task.cards.forEach((card, index) => {
        const updatedCard = { ...card, order: index }
        task.cards[index] = updatedCard
      })
      setData(newData)
      try {
        await Promise.all(
          task.cards.map(async (card) => {
            await updateCardPositionInDB(card.id, task.id, card.order)
          }),
        )
        fetchBoardData()
      } catch (error) {
        showErrorToast("Error updating card position")
      }
    } else {
      const sourceDroppableIndex = parseInt(
        source.droppableId.replace("droppable", ""),
        10,
      )
      const destDroppableIndex = parseInt(
        destination.droppableId.replace("droppable", ""),
        10,
      )
      const movedCard = newData[sourceDroppableIndex].cards[sourceIndex]
      const destCategoryTitle = newData[destDroppableIndex].title
      if (
        destCategoryTitle === "Release" &&
        (!movedCard.isCompleted || movedCard.release !== "RELEASED")
      ) {
        showErrorToast(
          "Only completed and released cards can be moved to Release.",
        )
        return
      }

      newData[sourceDroppableIndex].cards.splice(sourceIndex, 1)

      newData[sourceDroppableIndex].cards = newData[
        sourceDroppableIndex
      ].cards.map((card, index) => ({
        ...card,
        order: index,
      }))

      newData[destDroppableIndex].cards = newData[destDroppableIndex].cards.map(
        (card, index) => ({
          ...card,
          order: index,
        }),
      )

      newData[destDroppableIndex].cards.splice(destIndex, 0, movedCard)
      newData[destDroppableIndex].cards = newData[destDroppableIndex].cards.map(
        (card, index) => ({
          ...card,
          order: index,
        }),
      )

      const categoryProgress = {
        Backlog: 0,
        Todo: 10,
        "In Progress": 50,
        Done: 80,
        Release: 100,
      }

      const newProgress = categoryProgress[destCategoryTitle] || 0
      await updateTaskProgress({ taskId: movedCard.id, progress: newProgress })

      setData(newData)
      try {
        await Promise.all(
          newData[destDroppableIndex].cards.map(async (card) => {
            await updateCardPositionInDB(
              card.id,
              newData[destDroppableIndex].id,
              card.order,
            )
          }),
        )
        fetchBoardData()
      } catch (error) {
        showErrorToast("Error updating card position")
      }
    }
    fetchBoardData()
  }

  const [title, setTitle] = useState("")
  const handleTitleChange = (e) => {
    setTitle(e.target.value)
    setFlag(false)
  }
  const [submitted, setSubmitted] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      showInput(false)
      setFlag(true)
      setTitle("")
      setSubmitted(false)
      showErrorToast("Card name cannot be empty")
      return
    }
    setLoad(true)
    showInput(false)
    setFlag(true)
    await createTitle(
      {
        title: trimmedTitle,
        dueDate: null,
        priority: "medium",
        description: null,
        srNumber: null,
        issue: null,
      },
      id,
      boarduser,
      userName,
    )

    setLoad(false)
    setcreatenotification(false)

    setTitle("")
    setSubmitted(true)
    fetchBoardData()
  }

  const handleAddListClick = () => {
    setInputFieldVisible(true)
  }

  const handleAddListClose = async () => {
    setInputFieldVisible(false)
  }
  const handleTitleSubmit = async (e) => {
    e.preventDefault()
    const newTitle = name.trim()
    if (excludedCategory.includes(newTitle)) {
      showErrorToast("Cannot rename to a default category.")
      setcategory(false)
      return
    }
    const currentCategory = data.find((category) => category.id === id)
    if (!currentCategory || newTitle === currentCategory.title) {
      setcategory(false)
      return
    }
    try {
      const parsedId = parseInt(id.toString(), 10)
      const result = await editCategory(newTitle, parsedId)
      if (result.success) {
        setudpateboard(true)
        setcategory(false)
        showSuccessToast("Category name updated successfully")
        fetchBoardData()
      } else {
        showErrorToast("Failed to update category name")
        setcategory(false)
      }
    } catch (error) {
      showErrorToast("Failed to update category name")
    }
  }
  const handleAddList = async () => {
    try {
      const trimmedListName = newListInput.trim()
      if (trimmedListName === "") {
        handleAddListClose()
        return
      }
      if (excludedCategory.includes(trimmedListName)) {
        showErrorToast("Cannot create a default category.")
        setNewListInput("")
        setInputFieldVisible(false)
        return
      }
      setCategoryLoad(true)
      const result = await createTask(trimmedListName, boardId, "#8e78b6")

      if (result.success) {
        setupdate(true)
        setcreatenotification(false)
        setNewListInput("")
        setInputFieldVisible(false)
        showSuccessToast("Category created successfully")
        await fetchBoardData()
      } else {
        showErrorToast("Category already exists")
        setNewListInput("")
        setInputFieldVisible(false)
      }
    } catch (error) {
      showErrorToast("Failed to create category")
      setNewListInput("")
      setInputFieldVisible(false)
    } finally {
      setCategoryLoad(false)
    }
  }
  const toSentenceCase = (str) => {
    if (!str) return ""
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const isDoneCategory = (category) => category.title === "Done"

  const handleSelectAllDoneCards = (category) => {
    const doneCardIds = category.cards
      .filter((card) => card.status === "active")
      .map((card) => card.id)
    setSelectedCards((prev) => {
      const allSelected = doneCardIds.every((id) => prev.includes(id))
      if (allSelected) {
        return prev.filter((id) => !doneCardIds.includes(id))
      }
      return Array.from(new Set([...prev, ...doneCardIds]))
    })
  }

  const handleSelectCard = (cardId) => {
    setSelectedCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    )
  }

  useEffect(() => {
    fetchboard()
    fetchBoardData()
    setDefaultLoad(false)
  }, [updateBoard])
  const hasBlockerLinks = (card) =>
    !!(card.blockers?.length || card.blockedBy?.length)

  const getChecklistDisplay = (card) => {
    const items = card.checklistItems
    if (!items?.length) return null
    const completed = items.filter((item) => item.isComplete).length
    return { total: items.length, completed }
  }
  return TableView ? (
    <View data={data} handleCardRowClick={handleCardRowClick} />
  ) : defaultload ? (
    <Loader />
  ) : (
    <DndContext onDragEnd={onDragEnd}>
      <Stack
        direction={{ xs: "row", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
        className="overflow-x-scroll no-scrollbar"
      >
        {isMindMapOpen && (
          <MindMap
            theme={theme}
            onClose={handleMindMapToggle}
            boardId={boardId}
          />
        )}
        {isInsideBoard && (
          <div
            className="fixed top-30"
            style={{
              position: "fixed",
              top: "132px",
              right: "50px",
              display: "flex",
              gap: "10px",
            }}
          >
            <Button
              className="text-[#fefefe] dark:text-black"
              style={{
                backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
              }}
              isDisabled={selectedCards.length === 0}
              onPress={handleReleaseCheck}
            >
              <IoMdFlash size={25} />
              {!isSmallViewport && "Release"}
            </Button>
            <Button
              className="text-[#fefefe] dark:text-black pl-5 z--10"
              style={{
                backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
              }}
              onPress={handleMindMapToggle}
            >
              <RiMindMap size={25} />
              Mind Map
            </Button>
          </div>
        )}
        {data?.map((val, index) => (
          <Droppable
            key={index}
            droppableId={`droppable${index}`}
            isDropDisabled={false}
            isCombineEnabled={false}
            ignoreContainerClipping={false}
          >
            {(provided) => (
              <Box>
                <Box className="overflow-hidden">
                  <div style={{ position: "relative" }}>
                    {categoryedit &&
                    val.id === id &&
                    !excludedCategory.includes(val.title) ? (
                      <Input
                        color="secondary"
                        style={{
                          padding: "0.75rem 0.75rem",
                          fontWeight: "bold",
                        }}
                        className={`flex justify-between mb-2 ${
                          isSmallScreen ? "min-w-80" : "w-56"
                        } mt-3 dark:text-white py-2 px-2 border-gray-400 bg-800:bg-800 rounded shadow `}
                        defaultValue={val.title}
                        onFocus={() => setName(val.title)}
                        onBlur={(e) =>
                          name.trim() !== val.title
                            ? handleTitleSubmit(e)
                            : setcategory(false)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleTitleSubmit(e)
                          }
                        }}
                        onChange={(e) => setName(e.target.value)}
                      />
                    ) : (
                      <div
                        style={{ backgroundColor: val.color || "#8e78b6" }}
                        className="relative dark:bg-800 flex justify-between items-center mb-2 mt-5 font-bold text-white py-2 px-2 border-gray-400 rounded shadow"
                      >
                        <span className="flex items-center gap-2 truncate">
                          {toSentenceCase(val.title)}
                          {isDoneCategory(val) && (
                            <Checkbox
                              isSelected={
                                val.cards.filter(
                                  (card) => card.status === "active",
                                ).length > 0 &&
                                val.cards
                                  .filter((card) => card.status === "active")
                                  .every((card) =>
                                    selectedCards.includes(card.id),
                                  )
                              }
                              onChange={() => handleSelectAllDoneCards(val)}
                              className="absolute right-1.5 top-3 z-10 "
                              color="secondary"
                              size="sm"
                            />
                          )}
                          {val.title === "Release" &&
                          val.archivedCardCount > 0 ? (
                            <Tooltip
                              content={`${val.archivedCardCount} archived ${val.archivedCardCount === 1 ? "task" : "tasks"}`}
                              placement="top"
                              color="secondary"
                            >
                              <span
                                className="flex items-center justify-center w-5 h-5 text-xs font-semibold border border-white rounded-full cursor-default"
                                style={{
                                  backgroundColor: "white",
                                  color: val.color || "#7754BD",
                                }}
                              >
                                {val.archivedCardCount}
                              </span>
                            </Tooltip>
                          ) : (
                            val.activeCardCount > 0 && (
                              <Tooltip
                                content={`${val.activeCardCount} ${val.activeCardCount === 1 ? "task" : "tasks"}`}
                                placement="top"
                                color="secondary"
                              >
                                <span
                                  className="flex items-center justify-center w-5 h-5 text-xs font-semibold border border-white rounded-full cursor-default"
                                  style={{
                                    backgroundColor: "white",
                                    color: val.color || "#7754BD",
                                  }}
                                >
                                  {val.activeCardCount}
                                </span>
                              </Tooltip>
                            )
                          )}
                        </span>

                        <span>
                          {!excludedCategory.includes(val.title) && (
                            <CategoryOptions
                              taskid={val.id}
                              boardid={boardId}
                              setcategory={setcategory}
                              setId={setId}
                            />
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </Box>
                <Box
                  style={{
                    minHeight: "1rem",
                    height: "auto",
                    ...(isDoneCategory(val) &&
                      showCategoryCheckbox &&
                      hoveredCategoryId === val.id && {
                        overflow: "visible",
                      }),
                  }}
                  className={`crd-height ${isDoneCategory(val) && showCategoryCheckbox && hoveredCategoryId === val.id ? "no-scrollbar" : "overflow-y-auto no-scrollbar"} ${isSmallScreen ? "min-w-80" : "w-56"}`}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {val?.cards
                    ?.filter((card) => card.status === "active")
                    ?.map((card, indexId) => (
                      <div
                        key={card.id}
                        onMouseEnter={() => {
                          if (isDoneCategory(val)) setHoveredCardId(card.id)
                        }}
                        onMouseLeave={() => {
                          if (!selectedCards.includes(card.id)) {
                            setHoveredCardId(null)
                          }
                        }}
                        style={{ position: "relative" }}
                      >
                        <Draggable
                          draggableId={card?.id?.toString()}
                          index={indexId}
                        >
                          {(provideded) => (
                            <Card
                              className="mb-3 rounded shadow-none dark:bg-900 card"
                              {...provideded.dragHandleProps}
                              {...provideded.draggableProps}
                              ref={provideded.innerRef}
                              style={{
                                ...provideded.draggableProps.style,
                                ...(selectedCards.includes(card.id) && {
                                  border: "2px solid #A688FA",
                                }),
                              }}
                            >
                              {isDoneCategory(val) &&
                                (selectedCards.includes(card.id) ||
                                  hoveredCardId === card.id) && (
                                  <Checkbox
                                    isSelected={selectedCards.includes(card.id)}
                                    onChange={() => handleSelectCard(card.id)}
                                    className="absolute right-1 top-2 z-10"
                                    color="secondary"
                                    size="sm"
                                  />
                                )}
                              <Badge
                                showOutline={false}
                                className="bg-transparent mt-1.5"
                                placement="top-left"
                                content={
                                  <Tooltip
                                    content={card.priority || "medium"}
                                    color="secondary"
                                  >
                                    <span
                                      className="relative mt-3"
                                      style={{ zIndex: "1" }}
                                    >
                                      {getPriorityIcon(
                                        card.priority || "medium",
                                      )}{" "}
                                    </span>
                                  </Tooltip>
                                }
                              >
                                <CardBody
                                  onClick={() => {
                                    setId(card.id)
                                  }}
                                  className="px-2 py-0"
                                >
                                  <Link
                                    legacyBehavior
                                    href={`/${orgname.organization}/board/${boardId}/${card.id}`}
                                    passHref
                                  >
                                    <a
                                      className="cursor-pointer"
                                      style={{
                                        textDecoration: "none",
                                        height: "100%",
                                      }}
                                    >
                                      <CardHeader className="flex justify-between p-2 ">
                                        <span
                                          className="pl-2 top-1"
                                          style={{
                                            maxWidth:
                                              card.name.length > 15
                                                ? "150px"
                                                : "auto",
                                            wordWrap:
                                              card.name.length > 30
                                                ? "break-word"
                                                : "normal",
                                          }}
                                        >
                                          <span className="block max-h-[4.8em] leading-[1.2em] overflow-hidden">
                                            <span
                                              style={{
                                                display: "-webkit-box",
                                                WebkitBoxOrient: "vertical",
                                                WebkitLineClamp: 2,
                                                overflow: "hidden",
                                              }}
                                            >
                                              {toSentenceCase(card.name)}
                                            </span>
                                          </span>
                                        </span>
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation()
                                          }}
                                          onKeyDown={(e) => {
                                            e.stopPropagation()
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault()
                                            }
                                          }}
                                          role="button"
                                          tabIndex={0}
                                        >
                                          <div
                                            onClick={(e) => e.preventDefault()}
                                            onKeyDown={(e) => {
                                              e.stopPropagation()
                                              if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                              ) {
                                                e.preventDefault()
                                              }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                          >
                                            <div
                                              style={{
                                                position: "absolute",
                                                top:
                                                  isDoneCategory(val) &&
                                                  (selectedCards.includes(
                                                    card.id,
                                                  ) ||
                                                    hoveredCardId === card.id)
                                                    ? 30
                                                    : 9,
                                                right: 11,
                                              }}
                                            >
                                              <CardOption
                                                taskId={card.id}
                                                currentListId={val.id}
                                                moveCardToList={moveCardToList}
                                                cardTitle={card.name}
                                                boardId={boardId}
                                                boarduser={boarduser}
                                                username={userName}
                                              />
                                            </div>
                                          </div>
                                        </span>
                                      </CardHeader>
                                      <Box className="m-0 rounded-none ">
                                        <Box className="flex justify-start my-2">
                                          {card.label &&
                                          card.label.length > 0 ? (
                                            <>
                                              {card.label
                                                .slice(0, 2)
                                                .map((label, labelIndex) => (
                                                  <div
                                                    key={labelIndex}
                                                    className="inline-flex items-center justify-center h-6 px-2 overflow-hidden text-xs font-semibold text-black rounded-xl"
                                                    style={{
                                                      backgroundColor:
                                                        label.color,
                                                      marginRight:
                                                        labelIndex < 2
                                                          ? "3px"
                                                          : 0,
                                                    }}
                                                  >
                                                    <Tooltip
                                                      content={
                                                        label.name.length >
                                                        25 ? (
                                                          <>
                                                            {label.name
                                                              .match(/.{1,25}/g)
                                                              .map(
                                                                (line, idx) => (
                                                                  <div
                                                                    key={idx}
                                                                  >
                                                                    {line}
                                                                  </div>
                                                                ),
                                                              )}
                                                          </>
                                                        ) : (
                                                          label.name
                                                        )
                                                      }
                                                    >
                                                      <span className="dark:text-900">
                                                        {label.name.length > 12
                                                          ? `${label.name.slice(
                                                              0,
                                                              12,
                                                            )}...`
                                                          : label.name}
                                                      </span>
                                                    </Tooltip>
                                                  </div>
                                                ))}
                                              {card.label.length > 2 && (
                                                <div className="inline-block text-xs font-medium">
                                                  <div className="flex items-center justify-center border border-gray-400 rounded-full h-7 w-7 dark:text-text">
                                                    +{card.label.length - 2}
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <span />
                                          )}
                                        </Box>
                                      </Box>
                                      <div className="flex items-center justify-between mt-1 mb-1">
                                        {hasBlockerLinks(card) && (
                                          <FaLink className="text-red-500 dark:text-red-400" />
                                        )}
                                        {getChecklistDisplay(card) && (
                                          <div className="flex items-center gap-1">
                                            <TbChecklist className="w-6 h-6 text-gray-600 dark:text-text" />
                                            <span className="text-sm dark:text-text">
                                              {
                                                getChecklistDisplay(card)
                                                  .completed
                                              }
                                              /{getChecklistDisplay(card).total}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <Box className="flex items-center justify-between">
                                        <Box>
                                          <Box
                                            className="inline-block"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                            }}
                                          >
                                            <span className="inline-block">
                                              <AttachmentIcon className="text-gray-600 dark:text-text" />
                                            </span>
                                            <span className="inline-block ml-1 mr-3 text-sm dark:text-text">
                                              {card.attachments.length}
                                            </span>
                                          </Box>
                                          <Box
                                            className="inline-block"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                            }}
                                          >
                                            <InsertCommentIcon className="text-base text-gray-600 dark:text-text" />
                                            <span className="inline-block ml-1 mr-3 text-sm dark:text-text">
                                              {card.comments.length}
                                            </span>
                                          </Box>
                                        </Box>

                                        <Box className="flex mb-2">
                                          {card.assignedUsers.length > 0 ? (
                                            <AvatarGroup
                                              className="mt-1"
                                              size="sm"
                                              max={2}
                                              total={card.assignedUsers.length}
                                              renderCount={(count) =>
                                                count > 2 && (
                                                  <Avatar
                                                    isBordered
                                                    name={`+${count - 2}`}
                                                    size="sm"
                                                    className="w-6 h-6"
                                                  />
                                                )
                                              }
                                            >
                                              {card.assignedUsers
                                                .slice(0, 3)
                                                .map((user, cardIndex) => (
                                                  <Tooltip
                                                    placement="bottom"
                                                    showArrow
                                                    content={
                                                      user.name.length > 30 ? (
                                                        <>
                                                          {user.name
                                                            .match(/.{1,15}/g)
                                                            .map(
                                                              (line, idx) => (
                                                                <div key={idx}>
                                                                  {line}
                                                                </div>
                                                              ),
                                                            )}
                                                        </>
                                                      ) : (
                                                        user.name
                                                      )
                                                    }
                                                    key={cardIndex}
                                                  >
                                                    <Avatar
                                                      className="w-6 h-6"
                                                      isBordered
                                                      key={cardIndex}
                                                      name={
                                                        user.name
                                                          ? user.name.charAt(0)
                                                          : ""
                                                      }
                                                      size="sm"
                                                      src={user.photo}
                                                    />
                                                  </Tooltip>
                                                ))}
                                            </AvatarGroup>
                                          ) : null}

                                          {assignedTeams[card.id] &&
                                          assignedTeams[card.id].length > 0 ? (
                                            <AvatarGroup
                                              className="mt-1"
                                              size="sm"
                                              max={2}
                                              total={
                                                assignedTeams[card.id].length
                                              }
                                              renderCount={(count) =>
                                                count > 2 && (
                                                  <Avatar
                                                    isBordered
                                                    name={`+${count - 2}`}
                                                    size="sm"
                                                    className="w-6 h-6 mb-1 text-white bg-purple-600"
                                                  />
                                                )
                                              }
                                            >
                                              {assignedTeams[card.id]
                                                .slice(0, 3)
                                                .map((team, teamIndex) => (
                                                  <Tooltip
                                                    key={teamIndex}
                                                    placement="bottom"
                                                    showArrow
                                                    content={
                                                      team.name || "No Name"
                                                    }
                                                  >
                                                    <Avatar
                                                      className="w-6 h-6 text-white bg-purple-600"
                                                      isBordered
                                                      key={teamIndex}
                                                      name={
                                                        team.name
                                                          ? team.name.charAt(0)
                                                          : "T"
                                                      }
                                                      size="sm"
                                                    >
                                                      {team.name
                                                        ? team.name.charAt(0)
                                                        : "T"}
                                                    </Avatar>
                                                  </Tooltip>
                                                ))}
                                            </AvatarGroup>
                                          ) : null}
                                        </Box>
                                      </Box>
                                    </a>
                                  </Link>
                                </CardBody>
                              </Badge>
                            </Card>
                          )}
                        </Draggable>
                      </div>
                    ))}
                  {provided.placeholder}
                  {inputfeild && val.id === id && (
                    <form id="input" onSubmit={handleSubmit}>
                      <input
                        autoFocus
                        value={toSentenceCase(title)}
                        type="text"
                        onChange={handleTitleChange}
                        onBlur={handleSubmit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSubmit(e)
                        }}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        placeholder="Enter the title"
                      />
                    </form>
                  )}
                </Box>
                <Box className="flex justify-center">
                  {load && val.id === id ? (
                    <CircularProgress style={{ color: "#ed7620" }} />
                  ) : (
                    <Button
                      form="input"
                      type={flag ? "button" : "submit"}
                      className="flex w-3/5 justify-center items-center bg-[#ede7f6]  my-1.5 text-[#7754bd]  hover:bg-[#8e78b6] hover:text-white font-semibold  px-1 py-1 border border-gray-400 rounded-lg shadow dark:bg-700 dark:text-black"
                      onPress={() => {
                        if (val.id !== id || !submitted || !inputfeild) {
                          setId(val.id)
                          showInput(true)
                          setSubmitted(false)
                        } else {
                          setSubmitted(false)
                        }
                      }}
                    >
                      Add Card <MdAdd size={18} />
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Droppable>
        ))}

        <Box>
          <Box>
            {inputFieldVisible && !categoryLoad && (
              <input
                autoFocus
                type="text"
                value={toSentenceCase(newListInput)}
                onChange={(e) => setNewListInput(e.target.value)}
                onBlur={handleAddList}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddList()
                  }
                }}
                className="w-48 p-2 mt-5 mr-4 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Enter list name"
              />
            )}
          </Box>
          <Box>
            {categoryLoad ? (
              <CircularProgress className="mt-4" style={{ color: "#ed7620" }} />
            ) : (
              <Button
                type="button"
                className={`flex mt-5 font-semibold justify-center items-center bg-[#683ab7] text-white hover:bg-[#7754BC] px-4 py-2 border dark:bg-700 dark:text-black border-gray-400 rounded shadow ${
                  inputFieldVisible ? "w-16 mt-2 mx-auto" : "w-48 mr-4"
                }`}
                onPress={inputFieldVisible ? handleAddList : handleAddListClick}
              >
                {inputFieldVisible ? "Add" : "Add List"} <MdAdd size={18} />
              </Button>
            )}
          </Box>
        </Box>
      </Stack>
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onOpenChange={() => {
            setIsModalOpen(false)
            setSelectedVersionId("")
          }}
          aria-labelledby="release-confirmation-title"
          className="dark:bg-gray-900"
        >
          <ModalContent>
            <ModalHeader
              className="flex flex-col gap-1"
              id="release-confirmation-title"
            >
              Release Confirmation
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Are you sure you want to release {releaseCards.length} card
                {releaseCards.length > 1 ? "s" : ""}?<br />
                Please select a version to proceed.
              </p>
              <div className="mt-3">
                <Select
                  disallowEmptySelection
                  placeholder="Choose a version"
                  className="max-w-[30rem]"
                  aria-label="Select a version to release"
                  size="sm"
                  selectedKeys={selectedVersionId ? [selectedVersionId] : []}
                  onSelectionChange={(keys) => {
                    const keyArr = Array.from(keys)
                    setSelectedVersionId(
                      keyArr[0] !== undefined ? String(keyArr[0]) : "",
                    )
                  }}
                  color="secondary"
                >
                  {unreleasedVersions.length > 0 ? (
                    unreleasedVersions.map((version) => (
                      <SelectItem key={version.id} color="secondary">
                        {version.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem key="no-versions" color="secondary" isDisabled>
                      No versions available
                    </SelectItem>
                  )}
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                isDisabled={!selectedVersionId}
                onClick={() => handleRelease(selectedVersionId)}
              >
                Release
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </DndContext>
  )
}

Cards.propTypes = {
  boardId: PropTypes.number.isRequired,
}

export default Cards

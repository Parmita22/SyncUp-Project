"use client"

import React, { useEffect, useState } from "react"
import {
  Modal,
  ModalContent,
  ModalBody,
  Divider,
  Button,
  Breadcrumbs,
  BreadcrumbItem,
  Avatar,
  AvatarGroup,
  Select,
  SelectItem,
  Chip,
  Input,
  Checkbox,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Dropdown,
  Tooltip,
  Card,
  DateRangePicker,
  ScrollShadow,
} from "@heroui/react"
import { useSession } from "next-auth/react"
import { GoAlertFill } from "react-icons/go"
import { FaComments, FaAngleUp, FaAngleDown } from "react-icons/fa6"
import { IoAddOutline, IoAttachOutline, IoEyeOutline } from "react-icons/io5"
import { SiDependencycheck } from "react-icons/si"
import { RiTeamLine } from "react-icons/ri"
import {
  MdOutlineFileDownload,
  MdDescription,
  MdLocalOffer,
  MdLink,
  MdErrorOutline,
  MdEdit,
  MdOutlineTaskAlt,
  MdSend,
} from "react-icons/md"
import { FaRegThumbsUp, FaThumbsUp } from "react-icons/fa"
import { Editor, EditorState, convertFromRaw } from "draft-js"
import { BsCalendarDateFill, BsPeopleFill, BsReply } from "react-icons/bs"
import { BiSolidTrashAlt } from "react-icons/bi"
import dayjs from "dayjs"
import { useParams, useRouter } from "next/navigation"
import { parseDate } from "@internationalized/date"
import { RxActivityLog } from "react-icons/rx"
import {
  mapEventToMessage,
  NotificationEventConstants,
  preferenceToEventTypeMapping,
} from "./notification/eventMapper"
import { getPriorityIcon } from "@/src/utils/priorityUtlis"
import { createActivity } from "@/src/utils/createActivity"
import DependencyModal from "./DependencyModal"
import {
  cardData,
  updateCardTitle,
  updateInfo,
  updateUser,
  unassignUser,
  updateDates,
  cardTeams,
  checkCompleted,
  updateTaskProgress,
  getTaskCategory,
} from "@/server/task"
import { assignLabelToCard, unassignLabelFromCard } from "@/server/label"
import { fetchTeams, updateCardTeams } from "@/server/team"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"
import { allComments, createComment } from "@/server/comment"
import { moveCardToList } from "@/server/UpdateCardOrder"
import { updateCardPriority, getCardDependencies } from "../../server/task"
import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"
import GetSyncupData from "../../server/GetSyncupData"
import {
  allAttachment,
  createAttachment,
  handleDeleteAttachment,
} from "@/server/attachment"
import Loader from "@/src/components/Loader"
import RichTextEditor, { createLinkDecorator } from "./RichTextEditor"
import "draft-js/dist/Draft.css"
import { showErrorToast, showSuccessToast } from "../utils/toastUtils"
import ChecklistSection from "./Checklist/ChecklistSection"
import {
  fetchActivityLogs,
  fetchNotificationPreferences,
} from "@/src/components/notification/NotificationData"
import { getChecklistItems } from "@/server/checklist"

export default function ModalComponent() {
  const [selectedTab, setSelectedTab] = useState("comments")
  const params = useParams()
  const [isVisible, setIsVisible] = useState(true)
  const updateId = parseInt(params.cardid[0], 10)
  const boardId = params.id
  const [cid, setCid] = useState("")
  const { labels, assignedUserNames, boardData } = useGlobalSyncupContext()
  const [values, setValues] = useState(new Set([]))
  const [data, setModalData] = useState("")
  const [category, setCategory] = useState("")
  const [name, setName] = useState("")
  const [isTitleEmpty, setIsTitleEmpty] = useState(false)
  const [description, setDescription] = useState()
  const [cardLabel, setCardLabel] = useState([])
  const { data: session } = useSession()
  const [isChecked, setIsChecked] = useState(false)
  const [selectedKeys, setSelectedKeys] = React.useState(cardLabel)
  const [categories, setCategories] = useState([])
  const [notificationPreferences, setNotificationPreferences] = useState({})
  const formattedCreatedAt = data?.createdAt
    ? dayjs(data.createdAt).isValid()
      ? dayjs(data.createdAt).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD")
  const formattedDueDate = data?.dueDate
    ? dayjs(data.dueDate).isValid()
      ? dayjs(data.dueDate).format("YYYY-MM-DD")
      : dayjs().add(7, "day").format("YYYY-MM-DD")
    : dayjs().add(7, "day").format("YYYY-MM-DD")
  const minDate = dayjs(new Date()).format("YYYY-MM-DD")
  const selectedUsers = values
    ? Object.values(values).map((value) => value.id)
    : []
  const router = useRouter()
  const { setData } = useGlobalSyncupContext()
  const boardname = ""
  const [labelFlag, setLabelFlag] = useState(false)
  const [userFlag, setUserFlag] = useState(false)
  const [attachment, setAttachment] = useState([])
  const [flag, setFlag] = useState(false)
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(false)
  const [typeError, setTypeError] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState("")
  const [priorityFlag, setPriorityFlag] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editdesc, setEditDesc] = useState(false)
  const [, setCompletedBlockers] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedTeams, setSelectedTeams] = useState([])
  const [, setProgress] = useState(0)
  const [blockers, setBlockers] = useState([])
  const [blockedBy, setBlockedBy] = useState([])
  const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false)
  const [combinedLogs, setCombinedLogs] = useState([])
  const [showActivities, setShowActivities] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [, setComments] = useState([])
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [searchString, setSearchString] = useState("")
  const [isPoperOpen, setIsPoperOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [filteredUsers, setFilteredUsers] = useState(assignedUserNames)
  const handleActivityLog = (activity) => {
    setCombinedLogs((prevLogs) => [activity, ...prevLogs])
  }
  const handleCommentLike = async (commentId) => {
    setCombinedLogs((prevLogs) =>
      prevLogs.map((log) => {
        if (log.id === commentId) {
          const isCurrentlyLiked = log.likedBy?.some(
            (user) => user.email === session.user.email,
          )
          return {
            ...log,
            isLiked: !isCurrentlyLiked,
            likes: isCurrentlyLiked ? log.likes - 1 : log.likes + 1,
          }
        }
        return log
      }),
    )

    try {
      const res = await fetch("/api/toggle-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId,
          userEmail: session.user.email,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to toggle like")
      }

      const updated = await res.json()
      setCombinedLogs((prevLogs) =>
        prevLogs.map((log) =>
          log.id === commentId
            ? {
                ...log,
                isLiked: updated.isLiked,
                likes: updated.likes,
                likedBy: updated.likedBy,
              }
            : log,
        ),
      )
    } catch (error) {
      console.error("Error toggling like:", error)
      setCombinedLogs((prevLogs) =>
        prevLogs.map((log) => {
          if (log.id === commentId) {
            const isCurrentlyLiked = log.likedBy?.some(
              (user) => user.email === session.user.email,
            )
            return {
              ...log,
              isLiked: isCurrentlyLiked,
              likes: isCurrentlyLiked ? log.likes + 1 : log.likes - 1,
            }
          }
          return log
        }),
      )
      showErrorToast("Failed to update like status")
    }
  }
  useEffect(() => {
    const fetchLogsAndPreferences = async () => {
      try {
        const activities = await fetchActivityLogs(updateId)
        const fetchedComments = await allComments({ updateId })

        const preferences = await fetchNotificationPreferences(
          session.user.email,
        )
        setNotificationPreferences(preferences)

        const combined = [
          ...activities.map((activity) => ({
            ...activity,
            type: "activity",
          })),
          ...fetchedComments.map((comment) => ({
            ...comment,
            type: "comment",
            isLiked: false,
            likes: comment.likes || 0,
          })),
        ]
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setCombinedLogs(combined)
      } catch (error) {
        console.error("Error fetching logs or preferences:", error)
        showErrorToast("Error fetching activity logs or preferences")
      }
    }

    if (session?.user?.email) {
      fetchLogsAndPreferences()
    }
  }, [updateId, session?.user?.email])
  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const newCommentData = await createComment({
        updateId,
        comment: newComment,
        userEmail: session.user.email,
        authorName: session.user.name,
      })
      setCombinedLogs((prevLogs) => [
        {
          ...newCommentData,
          authorName: session.user.name,
          userEmail: session.user.email,
          userPhoto: session.user.image,
          type: "comment",
          isLiked: false,
          likes: 0,
        },

        ...prevLogs,
      ])

      setNewComment("")
    } catch (err) {
      console.error("Failed to add comment", err)
    }
  }
  const handleCommentChange = (e) => {
    const { value, selectionStart } = e.target
    setNewComment(value)
    const atIndex = value.lastIndexOf("@", selectionStart - 1) + 1
    const ch = value.charAt(value.lastIndexOf("@", selectionStart - 1) + 1)
    const previousValue = newComment

    if (atIndex !== 0 && atIndex < selectionStart) {
      const endIndex = value.indexOf(" ", atIndex)
      const newSearchString = value.substring(
        atIndex,
        endIndex !== -1 ? endIndex : value.length,
      )
      setSearchString(newSearchString)

      if (ch === "@") {
        setIsPoperOpen(true)
        setCount(selectionStart)
      }

      if (value.length < previousValue.length) {
        const deletedChar = previousValue.charAt(selectionStart)
        if (deletedChar === "@") {
          setIsPoperOpen(false)
        }
      }

      if (newSearchString.trim() !== "") {
        const filtered = assignedUserNames.filter((user) =>
          user.name.toLowerCase().startsWith(newSearchString.toLowerCase()),
        )
        setFilteredUsers(filtered)
      } else {
        setFilteredUsers(assignedUserNames)
      }
    } else if (value.slice(selectionStart - 1, selectionStart) === "@") {
      setSearchString("")
      setCount(selectionStart)
      setIsPoperOpen(true)
      setFilteredUsers(assignedUserNames)
    } else {
      setIsPoperOpen(false)
      setFilteredUsers([])
    }
  }

  const handleClick = (mentionedName) => {
    const mentionWithSymbol = `**${mentionedName}**`
    if (searchString === "" && count >= 0 && count <= newComment.length) {
      const updatedComment = `${newComment.slice(
        0,
        count - 1,
      )}@${mentionWithSymbol}${newComment.slice(count)}`
      setNewComment(updatedComment)
    } else {
      const regex = /(?<=@)\w+\b/g
      const updatedComment = newComment.replace(regex, mentionWithSymbol)
      setNewComment(updatedComment)
    }
    setIsPoperOpen(false)
  }

  useEffect(() => {
    const fetchDependencies = async () => {
      const dependencies = await getCardDependencies(updateId)
      setBlockers(dependencies.blockers)
      setBlockedBy(dependencies.blockedBy)
      setCompletedBlockers(dependencies.completedBlockers || [])
    }
    fetchDependencies()
  }, [updateId, isDependencyModalOpen])

  const fetchData = async () => {
    try {
      const updatedData = await GetSyncupData(boardId)
      setData(updatedData)
    } catch (error) {
      showErrorToast("Error fetching data")
    }
  }
  const handleTeamSelection = async (selectedItems) => {
    const selectedTeamIds = Array.from(selectedItems)
      .map((key) => parseInt(key, 10))
      .filter((id) => !Number.isNaN(id))

    const previouslySelectedTeamIds = selectedTeams.map((id) =>
      parseInt(id, 10),
    )

    const newlySelectedTeamIds = selectedTeamIds.filter(
      (id) => !previouslySelectedTeamIds.includes(id),
    )

    const deselectedTeamIds = previouslySelectedTeamIds.filter(
      (id) => !selectedTeamIds.includes(id),
    )

    const authorName = session?.user?.name

    try {
      if (newlySelectedTeamIds.length > 0) {
        await updateCardTeams({
          updateId,
          teamIds: newlySelectedTeamIds,
          operation: "connect",
          authorName,
        })
        newlySelectedTeamIds.forEach(() => {
          const activityMessage = mapEventToMessage(
            NotificationEventConstants.TEAM_ASSIGNED_TO_CARD,
            authorName,
            "",
          )
          const newActivity = {
            id: Date.now(),
            cardId: updateId,
            eventType: NotificationEventConstants.TEAM_UNASSIGNED_FROM_CARD,
            details: activityMessage,
            triggeredBy: authorName,
            createdAt: new Date().toISOString(),
            type: "activity",
          }

          setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
        })
      }

      if (deselectedTeamIds.length > 0) {
        await updateCardTeams({
          updateId,
          teamIds: deselectedTeamIds,
          operation: "disconnect",
          authorName,
        })
        deselectedTeamIds.forEach(() => {
          const activityMessage = mapEventToMessage(
            NotificationEventConstants.TEAM_UNASSIGNED_FROM_CARD,
            authorName,
            "",
          )

          const newActivity = {
            id: Date.now(),
            cardId: updateId,
            eventType: NotificationEventConstants.TEAM_UNASSIGNED_FROM_CARD,
            details: activityMessage,
            triggeredBy: authorName,
            createdAt: new Date().toISOString(),
            type: "activity",
          }

          setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
        })
      }

      setSelectedTeams(selectedTeamIds.map((id) => id.toString()))
    } catch (error) {
      showErrorToast("Error updating teams")
    }
  }
  const categoryProgress = {
    Backlog: 0,
    Todo: 10,
    "In Progress": 50,
    Done: 80,
    Release: 100,
  }

  const refreshDependencies = async () => {
    const dependencies = await getCardDependencies(updateId)
    setBlockers(dependencies.blockers)
    setBlockedBy(dependencies.blockedBy)
  }
  const handleFileChange = async (event) => {
    const { files } = event.target

    const uploadPromises = Array.from(files).map(async (file) => {
      const authorName = session?.user?.name || "Unknown User"
      const fileName = file.name

      if (!file.type.startsWith("image/")) {
        setTypeError(true)
        return
      }
      if (file.size >= 1024 * 1024) {
        setAlert(true)
        return
      }

      try {
        let filePath

        if (process.env.NEXT_PUBLIC_ENVIRONMENT === "dev") {
          const reader = new FileReader()
          filePath = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error("File reading failed"))
            reader.readAsDataURL(file)
          })
        } else {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            showErrorToast("Failed to upload file")
          }

          const imagePath = await response.text()
          filePath = imagePath.trim().replace(/^"|"$/g, "")
        }
        await createAttachment({
          updateId,
          path: filePath,
          name: fileName,
          authorName,
        })

        const newActivity = createActivity(
          NotificationEventConstants.ATTACHMENT_ADDED,
          authorName,
          updateId,
          fileName,
        )
        setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])

        setFlag(true)
      } catch (error) {
        console.error("Error uploading file:", error)
        showErrorToast("Error uploading file")
      }
    })

    await Promise.all(uploadPromises)
  }
  const formatTime = (dateString) => {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
    return new Date(dateString).toLocaleTimeString([], options)
  }

  const handlePriorityChange = async (event) => {
    const newPriority = event.target.value
    const authorName = session?.user?.name

    try {
      await updateCardPriority({
        updateId,
        priority: newPriority,
        authorName,
      })

      setPriorityFlag(true)
      setSelectedPriority(newPriority)

      const newActivity = createActivity(
        NotificationEventConstants.CARD_PRIORITY_UPDATED,
        authorName,
        updateId,
      )

      setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
    } catch (error) {
      showErrorToast("Error updating priority")
    }
  }

  const handleDroppedFile = async (droppedFile) => {
    const droppedFileName = droppedFile.name

    if (process.env.NEXT_PUBLIC_ENVIRONMENT === "dev") {
      if (droppedFile.type.startsWith("image/")) {
        if (droppedFile.size < 1024 * 1024) {
          const reader = new FileReader()
          reader.readAsDataURL(droppedFile)

          reader.onload = async () => {
            try {
              await createAttachment({
                updateId,
                path: reader.result,
                name: droppedFileName,
              })
              setFlag(true)
            } catch (error) {
              showErrorToast("Error uploading file")
            }
          }
          setAlert(false)
        } else {
          setAlert(true)
        }
        setTypeError(false)
      } else {
        setTypeError(true)
      }
    } else {
      try {
        const formData = new FormData()
        formData.append("file", droppedFile)
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          showErrorToast("Failed to upload file")
        }
        const imagePath = await response.text()
        const trimmedImagePath = imagePath.trim()
        const sanitizedImagePath = trimmedImagePath.replace(/^"|"$/g, "")
        await createAttachment({
          updateId,
          path: sanitizedImagePath,
          name: droppedFileName,
        })
        setFlag(true)
      } catch (error) {
        showErrorToast("Error uploading file")
      }
    }
  }
  useEffect(() => {
    const fetch = async () => {
      if (flag === true) {
        const attachments = await allAttachment({ updateId })
        setAttachment(attachments)
        fetchData()
      }
    }
    fetch()
    setFlag(false)
  }, [flag])
  const handleDelete = async (filename, id) => {
    try {
      const response = await fetch(
        `/api/delete?fileName=${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        showErrorToast("Failed to delete file from S3")
      }

      await handleDeleteAttachment({ id })
      setFlag(true)
      fetchData()
    } catch (error) {
      showErrorToast("Error deleting file from S3")
    }
  }
  const convertDescriptionToEditorState = (desc) => {
    if (!desc) return EditorState.createEmpty(createLinkDecorator())

    try {
      const contentState = convertFromRaw(JSON.parse(desc))
      return EditorState.createWithContent(contentState, createLinkDecorator())
    } catch (error) {
      console.error("Error parsing description:", error)
      return EditorState.createEmpty(createLinkDecorator())
    }
  }
  const [editorState, setEditorState] = useState(() => {
    return EditorState.createEmpty(createLinkDecorator())
  })
  useEffect(() => {
    if (description) {
      const newEditorState = convertDescriptionToEditorState(description)
      setEditorState(newEditorState)
    } else {
      setEditorState(EditorState.createEmpty())
    }
    return () => {
      setEditorState(EditorState.createEmpty())
    }
  }, [description])

  const handleDescriptionChange = (newDescription) => {
    try {
      const parsedDescription =
        typeof newDescription === "string"
          ? JSON.parse(newDescription)
          : newDescription

      setDescription(JSON.stringify(parsedDescription))
      const newEditorState = convertDescriptionToEditorState(
        JSON.stringify(parsedDescription),
      )
      setEditorState(newEditorState)
    } catch (error) {
      console.error("Error handling description change:", error)
      showErrorToast("Error updating description")
    }
  }
  const handleEditDesc = () => {
    if (!editdesc && editorState) {
      const contentState = editorState.getCurrentContent()
      const newEditorState = EditorState.createWithContent(
        contentState,
        createLinkDecorator(),
      )
      setEditorState(newEditorState)
    }
    setEditDesc(!editdesc)
  }
  useEffect(() => {
    if (boardData.length !== 0) {
      const fetchCategories = async () => {
        try {
          setCategories(
            boardData.find((board) => board.id === parseInt(boardId, 10)).tasks,
          )
        } catch (error) {
          showErrorToast("Error fetching categories")
        }
      }
      fetchCategories()
    }
  }, [])
  const fetchCard = async () => {
    if (updateId) {
      const newData = await cardData({ updateId })
      if (!newData) {
        showErrorToast("Card not found")
        router.push(`/${params.organization}/board/${boardId}`)
        return
      }
      setLoading(false)
      setModalData(newData)
      setCategory(newData?.task)
      setCid(newData?.taskId)
      setCardLabel(newData?.label)
      setName(newData.name)
      setDescription(newData?.description)
      setIsChecked(newData?.isCompleted)
      setSelectedPriority(newData.priority)
      setAttachment(newData.attachments)
      setValues(newData.assignedUsers)
      const assignedTeams = await cardTeams({ updateId })
      setSelectedTeams(assignedTeams.map((team) => team.id.toString()))
    }
  }
  useEffect(() => {
    fetchCard()
    setUserFlag(false)
  }, [updateId, userFlag])

  useEffect(() => {
    if (description) {
      const newEditorState = convertDescriptionToEditorState(description)
      setEditorState(newEditorState)
    } else {
      setEditorState(EditorState.createEmpty())
    }
    return () => {
      setEditorState(EditorState.createEmpty())
    }
  }, [description])

  const handleCheckboxChange = async () => {
    const authorName = session?.user?.name

    try {
      if (!isChecked && blockers.some((blocker) => !blocker.isCompleted)) {
        showErrorToast("Cannot complete card until all blockers are completed")
        return
      }

      const doneCategory = categories.find((cat) => cat.category === "Done")
      if (!doneCategory) {
        showErrorToast("Done category not found")
        return
      }

      if (!isChecked) {
        await moveCardToList(updateId, cid, doneCategory.id)
        setCid(doneCategory.id)
      }

      await checkCompleted({
        updateId,
        isChecked: !isChecked,
        authorName,
      })

      setIsChecked(!isChecked)

      const statusDetails = !isChecked ? "completed" : "incompleted"
      if (!isChecked) {
        setProgress(100)
        showSuccessToast("Card marked as completed")

        const newActivity = createActivity(
          NotificationEventConstants.CARD_UPDATED,
          authorName,
          updateId,
          statusDetails,
        )
        setCombinedLogs((prevLogs) => {
          const updatedLogs = [newActivity, ...prevLogs]
          return updatedLogs
        })
      } else {
        const taskCategory = await getTaskCategory(updateId)
        const newProgress = categoryProgress[taskCategory]

        await updateTaskProgress({ taskId: updateId, progress: newProgress })
        showSuccessToast("Card marked as incompleted")

        const newActivity = createActivity(
          NotificationEventConstants.CARD_UPDATED,
          authorName,
          updateId,
          statusDetails,
        )
        setCombinedLogs((prevLogs) => {
          const updatedLogs = [newActivity, ...prevLogs]
          return updatedLogs
        })
      }

      await fetchCard()
      await fetchData()
    } catch (error) {
      console.error("Checkbox change error:", error)
      showErrorToast(
        "Cannot complete card until all checklist items are completed",
      )
      setIsChecked(isChecked)
    }
  }
  useEffect(() => {
    fetchCard()
    setUserFlag(false)
  }, [updateId, userFlag])
  useEffect(() => {
    if (labelFlag === true) {
      fetchCard()
      setLabelFlag(false)
    }
  }, [labelFlag])
  useEffect(() => {
    if (priorityFlag === true) {
      fetchCard()
      setPriorityFlag(false)
    }
  }, [priorityFlag])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    showSuccessToast("Link copied to clipboard!")
  }

  const handelChange = async (e) => {
    setName(e.target.value)
    setIsTitleEmpty(e.target.value?.trim() === "")
  }

  const handelSubmit = async (e) => {
    e.preventDefault()

    if (name?.trim() !== "") {
      const authorName = session?.user?.name
      const response = await fetch(`/api/card/${updateId}`)
      const cardData = await response.json()
      const oldName = cardData?.name || ""

      await updateCardTitle({
        updateId,
        name,
        authorName,
      })
      const newActivity = createActivity(
        NotificationEventConstants.CARD_RENAMED,
        authorName,
        updateId,
        `from "${oldName}" to "${name}"`,
      )

      setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
      setLabelFlag(true)
      setIsEditing(false)
    }

    fetchData()
  }

  const handleEditClick = () => {
    setIsEditing(true)
  }
  const updateCard = async () => {
    const authorName = session?.user?.name

    if (updateId) {
      await updateInfo({
        updateId,
        description,
        authorName,
      })

      const newActivity = createActivity(
        NotificationEventConstants.CARD_DESCRIPTION_UPDATED,
        authorName,
        updateId,
        "",
      )
      setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
    }

    fetchData()
    setEditDesc(false)
  }
  const fetchComments = async () => {
    try {
      const fetchedComments = await allComments({ updateId })
      setComments(fetchedComments)
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }
  useEffect(() => {
    const fetchTeamsForBoard = async () => {
      try {
        if (!boardId) return
        const fetchedTeams = await fetchTeams(boardId)
        setTeams(fetchedTeams)
      } catch (error) {
        showErrorToast("Error fetching teams for the board")
      }
    }
    fetchTeamsForBoard()
  }, [boardId])

  const renderMessage = (message) => {
    const parts = message.split(/<\/?strong>/)
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <span key={index} className="font-bold">
          {part}
        </span>
      ) : (
        part
      ),
    )
  }
  useEffect(() => {
    fetchComments()
  }, [])

  const handleReply = (commentId) => {
    if (replyingTo === commentId) {
      setReplyingTo(null)
    } else {
      setReplyingTo(commentId)
      setReplyText("")
    }
  }

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return

    try {
      const newReply = await createComment({
        updateId,
        comment: replyText,
        userEmail: session.user.email,
        authorName: session.user.name,
        parentId: commentId,
      })
      setCombinedLogs((prevLogs) =>
        prevLogs.map((log) => {
          if (log.id === commentId) {
            return {
              ...log,
              replies: [
                ...(log.replies || []),
                {
                  ...newReply,
                  authorName: session.user.name,
                  userEmail: session.user.email,
                  userPhoto: session.user.image,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          }
          return log
        }),
      )
      setReplyText("")
      setReplyingTo(null)
    } catch (error) {
      console.error("Error adding reply:", error)
      showErrorToast("Failed to add reply. Please try again.")
    }
  }

  useEffect(() => {
    const initializeCategories = async () => {
      try {
        if (boardData.length !== 0) {
          const boardCategories = boardData.find(
            (board) => board.id === parseInt(boardId, 10),
          )?.tasks
          if ((!boardCategories || boardCategories.length === 0) && category) {
            setCategories([category.task])
          } else {
            setCategories(boardCategories || [])
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
        if (category) {
          setCategories([category.task])
        }
      }
    }
    initializeCategories()
  }, [boardData, boardId, category])
  const getUserInitials = (fullName) => {
    if (!fullName) return ""
    const nameParts = fullName.trim().split(" ")
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase()
    return `${nameParts[0][0].toUpperCase()}${nameParts[nameParts.length - 1][0].toUpperCase()}`
  }

  const handleMoveCard = async (value) => {
    try {
      const toListId = parseInt(
        typeof value === "object" ? value.target.value : value,
        10,
      )

      if (!toListId) {
        showErrorToast("Invalid target list ID")
        return
      }
      const targetCategory = categories.find(
        (categoryName) => categoryName.id === toListId,
      )
      if (!targetCategory) {
        showErrorToast("Target category not found")
        return
      }
      if (targetCategory.category === "Release") {
        if (!isChecked) {
          showErrorToast(
            "Only completed cards can be moved to the Release category.",
          )
          return
        }
        if (data.release !== "RELEASED") {
          showErrorToast(
            "please release the card into particular version before moving to release category",
          )
          return
        }
      }
      const isCompletionCategory = ["Done", "Release"].includes(
        targetCategory.category,
      )
      const hasIncompleteBlockers = blockers.some(
        (blocker) => !blocker.isCompleted && blocker.status !== "archived",
      )
      if (isCompletionCategory && hasIncompleteBlockers) {
        showErrorToast("Cannot move card until all blockers are completed")
        return
      }

      if (isCompletionCategory) {
        const checklistItems = await getChecklistItems(updateId)
        const incompleteItems = checklistItems.filter(
          (item) => !item.isComplete && !item.convertedCardId,
        )
        if (incompleteItems.length > 0) {
          showErrorToast(
            "Cannot move card until all checklist items are completed",
          )
          return
        }
      }

      const authorName = session?.user?.name
      await moveCardToList(updateId, cid, toListId, authorName)

      const oldCategory = category?.category
      const newCategory = targetCategory.category
      const activityMessage = createActivity(
        NotificationEventConstants.CATEGORY_CHANGED,
        authorName,
        updateId,
        `from "${oldCategory}" to "${newCategory}"`,
      )
      setCombinedLogs((prevLogs) => [activityMessage, ...prevLogs])
      setCid(toListId)
      await fetchCard()
      await fetchData()
      showSuccessToast("Card moved successfully")
    } catch (error) {
      showErrorToast("Error moving card")
    }
  }

  const handleSelectionChange = async (selectedLabels, cardId) => {
    try {
      const currentLabels = Array.from(selectedKeys)
      const newlySelectedLabels = Array.from(selectedLabels)
      const authorName = session?.user?.name

      const labelsToAdd = newlySelectedLabels.filter(
        (labelId) => !currentLabels.includes(labelId),
      )
      const labelsToRemove = currentLabels.filter(
        (labelId) => !newlySelectedLabels.includes(labelId),
      )

      if (labelsToRemove.length > 0) {
        await unassignLabelFromCard(cardId, labelsToRemove, authorName)

        labelsToRemove.forEach((labelId) => {
          labels.find((item) => item.id === labelId)
          const newActivity = createActivity(
            NotificationEventConstants.LABEL_REMOVED,
            authorName,
            cardId,
            data.name,
          )
          setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
        })
      }

      if (labelsToAdd.length > 0) {
        await assignLabelToCard(cardId, labelsToAdd, authorName)

        labelsToAdd.forEach((labelId) => {
          labels.find((item) => item.id === labelId)
          const newActivity = createActivity(
            NotificationEventConstants.LABEL_ADDED,
            authorName,
            cardId,
            data.name,
          )
          setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
        })
      }

      setSelectedKeys(new Set(newlySelectedLabels))
      setLabelFlag(true)
    } catch (error) {
      showErrorToast("Error updating labels")
    }

    fetchData()
  }
  const setUserId = async (selectedItems) => {
    const Keys = Array.from(selectedItems)
    const selectedUserIds = Keys.map((key) => parseInt(key, 10)).filter(
      (id) => !Number.isNaN(id),
    )

    const previouslySelectedUserIds = values.map((user) => user.id)

    const newlySelectedUserIds = selectedUserIds.filter(
      (id) => !previouslySelectedUserIds.includes(id),
    )

    const deselectedUserIds = previouslySelectedUserIds.filter(
      (id) => !selectedUserIds.includes(id),
    )

    const authorName = session?.user?.name

    if (newlySelectedUserIds.length > 0) {
      await updateUser({
        selectedUserId: newlySelectedUserIds,
        updateId,
        authorName,
      })

      setUserFlag(true)
      newlySelectedUserIds.forEach((userId) => {
        const assignedUser = assignedUserNames.find(
          (user) => user.id === userId,
        )
        const newActivity = createActivity(
          NotificationEventConstants.USER_ASSIGNED,
          authorName,
          updateId,
          assignedUser?.name || "Unknown User",
        )

        setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
      })
    }

    if (deselectedUserIds.length > 0) {
      deselectedUserIds.forEach(async (userId) => {
        await unassignUser({
          selectedUserId: userId,
          updateId,
          authorName,
        })

        setUserFlag(true)
        const unassignedUser = assignedUserNames.find(
          (user) => user.id === userId,
        )
        const newActivity = createActivity(
          NotificationEventConstants.USER_UNASSIGNED,
          authorName,
          updateId,
          unassignedUser?.name || "Unknown User",
        )

        setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
      })
    }

    fetchData()
  }

  const handleModalClose = () => {
    setIsVisible(false)
    router.push(`/${params.organization}/board/${boardId}`)
    setIsTitleEmpty(false)
    setDescription("")
    fetchData()
  }

  const handleDateChange = async (dateRange) => {
    const authorName = session?.user?.name
    const startValue = dateRange.start.toString()
    const endValue = dateRange.end.toString()

    await updateDates({ updateId, startValue, endValue, authorName })
    const newActivity = createActivity(
      "CARD_DATES_UPDATED",
      authorName,
      updateId,
    )
    setCombinedLogs((prevLogs) => [newActivity, ...prevLogs])
    setLabelFlag(true)
  }

  const [isOpen, setIsOpen] = useState([])
  const toggleModal = (index) => {
    const updatedIsOpen = [...isOpen]
    updatedIsOpen[index] = !updatedIsOpen[index]
    setIsOpen(updatedIsOpen)
  }
  const [hoveredAttachmentIndex, setHoveredAttachmentIndex] = useState(-1)
  const [hoveredFileIndex, setHoveredFileIndex] = useState(-1)
  const [hoveredVideoIndex, setHoveredVideoIndex] = useState(-1)
  const handleHover = (index, isHovered) => {
    if (isHovered) {
      setHoveredAttachmentIndex(index)
    } else {
      setHoveredAttachmentIndex(-1)
    }
  }

  const handleFileHover = (index, isHovered) => {
    if (isHovered) {
      setHoveredFileIndex(index)
    } else {
      setHoveredFileIndex(-1)
    }
  }
  const handleVideoHover = (index, isHovered) => {
    if (isHovered) {
      setHoveredVideoIndex(index)
    } else {
      setHoveredVideoIndex(-1)
    }
  }

  const handleButtonClick = () => {
    const fileInput = document.getElementById("fileInput")
    if (fileInput) {
      fileInput.click()
    }
  }
  const styleMap = {
    CODE: {
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
      fontSize: 16,
      padding: 2,
    },
    LINK: {
      color: "#007bff",
      textDecoration: "underline",
      cursor: "pointer",
    },
  }
  const handleCardNavigation = (cardId) => {
    router.push(`/${params.organization}/board/${boardId}/${cardId}`)
  }
  return (
    <Modal
      backdrop="opaque"
      isOpen={isVisible}
      onClose={handleModalClose}
      placement="center"
      isDismissable={false}
      isKeyboardDismissDisabled={false}
      classNames={{
        base: "max-w-[80%] h-[82vh] p-2 m-0 dark:bg-gray-900 rounded-2xl",
        wrapper: "h-[95vh] overflow-hidden",
        body: "p-0 h-full",
        closeButton:
          "top-3 right-4 z-50 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
      }}
    >
      <ModalContent>
        {() => (
          <div className="flex flex-col h-full">
            {loading ? (
              <Loader />
            ) : (
              <div className="flex h-full">
                <div className="flex flex-col w-7/12 h-full overflow-x-hidden overflow-y-auto">
                  <div className="flex-none mt-[-5px] p-4">
                    <div className="flex ">
                      <div className="mt-2">
                        <Tooltip
                          content="Copy link"
                          placement="bottom"
                          showArrow
                          size="sm"
                        >
                          <div>
                            <MdLink
                              className="ml-2 text-xl"
                              onClick={handleCopyLink}
                            />
                          </div>
                        </Tooltip>
                      </div>
                      <Breadcrumbs className="flex m-2">
                        <BreadcrumbItem>
                          {boardname.length > 15 ? (
                            <Tooltip
                              content={
                                boardname.length > 15 ? (
                                  <>
                                    {boardname
                                      .match(/.{1,15}/g)
                                      .map((line, index) => (
                                        <div key={index}>{line}</div>
                                      ))}
                                  </>
                                ) : (
                                  boardname
                                )
                              }
                            >
                              <span className="font-semibold text-black text-md dark:text-white">
                                {boardname.substring(0, 15)}...
                              </span>
                            </Tooltip>
                          ) : (
                            <span className="font-semibold text-black text-md dark:text-white">
                              {boardname}
                            </span>
                          )}
                        </BreadcrumbItem>
                        <BreadcrumbItem>
                          <Dropdown>
                            <DropdownTrigger>
                              <span className="font-semibold text-black text-md dark:text-white">
                                {category?.category.length > 30
                                  ? `${category?.category.substring(0, 30)}...`
                                  : category?.category}
                              </span>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Static Actions">
                              {categories.map((singleCategory) => (
                                <DropdownItem
                                  key={singleCategory.id}
                                  onClick={() => {
                                    handleMoveCard(singleCategory.id)
                                  }}
                                  variant="solid"
                                  color="secondary"
                                >
                                  <span>
                                    {singleCategory.category.length > 30
                                      ? `${singleCategory.category.substring(0, 30)}...`
                                      : singleCategory.category}
                                  </span>
                                </DropdownItem>
                              ))}
                            </DropdownMenu>
                          </Dropdown>
                        </BreadcrumbItem>
                        <BreadcrumbItem>
                          {data.name.length > 30 ? (
                            <Tooltip
                              content={
                                data.name.length > 15 ? (
                                  <>
                                    {data.name
                                      .match(/.{1,15}/g)
                                      .map((line, index) => (
                                        <div key={index}>{line}</div>
                                      ))}
                                  </>
                                ) : (
                                  data.name
                                )
                              }
                            >
                              <div className="font-semibold text-black dark:text-white">
                                {`${data.name.substring(0, 30)}${data.name.length > 30 ? "..." : ""}`}
                              </div>
                            </Tooltip>
                          ) : (
                            <span className="font-semibold text-black dark:text-white">
                              {`${data.name.substring(0, 30)}${data.name.length > 30 ? "..." : ""}`}
                            </span>
                          )}
                        </BreadcrumbItem>
                      </Breadcrumbs>
                    </div>
                  </div>
                  <div className="flex-1 px-4 overflow-y-auto">
                    <ModalBody className="h-full">
                      <div>
                        <div
                          onClick={handleEditClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleEditClick()
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          style={{ fontWeight: "bold", fontSize: "1.25rem" }}
                        >
                          {isEditing ? (
                            <Input
                              variant="bordered"
                              value={name}
                              onChange={handelChange}
                              onBlur={handelSubmit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handelSubmit(e)
                              }}
                              style={{
                                fontWeight: "bold",
                                fontSize: "1.25rem",
                                width: "100%",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                marginLeft: "14px",
                                fontSize: "1.25rem",
                                display: "flex",
                                flexWrap: "wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {name}
                            </div>
                          )}
                        </div>

                        {isTitleEmpty && (
                          <Tooltip
                            content="Card name cannot be empty"
                            placement="bottom"
                            size="sm"
                          >
                            <div className="flex justify-end mt-1">
                              <MdErrorOutline
                                style={{
                                  color: "red",
                                  fontSize: "medium",
                                }}
                              />
                            </div>
                          </Tooltip>
                        )}
                      </div>
                      <div className="grid grid-cols-2 mt-4 mb-4 gap-x-8 gap-y-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                              <MdOutlineTaskAlt className="text-lg text-green-500" />
                              Status
                            </span>
                            <div className="flex items-center justify-between flex-1 max-w-[70%] gap-2">
                              <Select
                                className="w-full dark:bg-gray-800"
                                classNames={{
                                  trigger: "dark:bg-gray-800 dark:text-white",
                                  value: "dark:text-white",
                                }}
                                selectedKeys={[category?.id?.toString()]}
                                onChange={(value) => handleMoveCard(value)}
                                size="sm"
                              >
                                {categories.map((cat) => (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id}
                                    className={
                                      cat.id === category?.id
                                        ? "bg-default-100"
                                        : ""
                                    }
                                    color="secondary"
                                  >
                                    {cat.category}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Checkbox
                                className="flex-none"
                                color="success"
                                isSelected={isChecked}
                                onChange={handleCheckboxChange}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                              <BsCalendarDateFill className="text-lg text-blue-500" />
                              Dates
                            </span>
                            <DateRangePicker
                              className="flex-1 max-w-[70%]"
                              onChange={handleDateChange}
                              defaultValue={{
                                start: parseDate(formattedCreatedAt),
                                end: parseDate(formattedDueDate),
                              }}
                              minValue={parseDate(minDate)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                              <GoAlertFill className="text-lg text-red-500" />
                              Priority
                            </span>
                            <Select
                              className="flex-1 max-w-[70%] dark:bg-gray-800"
                              classNames={{
                                trigger: "dark:bg-gray-800 dark:text-white",
                                value: "dark:text-white",
                              }}
                              aria-label="priority"
                              selectedKeys={[selectedPriority]}
                              onChange={handlePriorityChange}
                              size="sm"
                            >
                              <SelectItem
                                key="highest"
                                startContent={getPriorityIcon("highest")}
                                color="secondary"
                              >
                                Highest
                              </SelectItem>
                              <SelectItem
                                key="high"
                                startContent={getPriorityIcon("high")}
                                color="secondary"
                              >
                                High
                              </SelectItem>
                              <SelectItem
                                key="medium"
                                startContent={getPriorityIcon("medium")}
                                color="secondary"
                              >
                                Medium
                              </SelectItem>
                              <SelectItem
                                key="low"
                                startContent={getPriorityIcon("low")}
                                color="secondary"
                              >
                                Low
                              </SelectItem>
                              <SelectItem
                                key="lowest"
                                startContent={getPriorityIcon("lowest")}
                                color="secondary"
                              >
                                Lowest
                              </SelectItem>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                              <MdLocalOffer className="text-lg text-purple-500" />
                              Labels
                            </span>
                            <div className="flex gap-2 items-center flex-1 max-w-[70%]">
                              {cardLabel && (
                                <>
                                  {Object.values(cardLabel)
                                    .slice(0, 2)
                                    .map((label, index) => (
                                      <Chip
                                        size="sm"
                                        key={index}
                                        style={{ backgroundColor: label.color }}
                                        variant="flat"
                                        className="text-xs dark:text-900"
                                        title={label.name}
                                      >
                                        <span
                                          style={{
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow:
                                              label.name.length > 10
                                                ? "ellipsis"
                                                : "unset",
                                          }}
                                        >
                                          {label.name.length > 10
                                            ? `${label.name.slice(0, 10)}...`
                                            : label.name}
                                        </span>
                                      </Chip>
                                    ))}
                                </>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Dropdown placement="top-start">
                                  <DropdownTrigger>
                                    <Button
                                      isIconOnly
                                      radius="full"
                                      className="w-2 h-7 bg-[#e4d4f4] hover:bg-[#7828c8] text-[#7828c8] hover:text-white  dark:bg-700 dark:text-black"
                                      variant="faded"
                                    >
                                      {cardLabel ? (
                                        Object.values(cardLabel).length > 2 ? (
                                          <>
                                            <IoAddOutline className="w-3 h-3 font-semibold" />
                                            {Object.values(cardLabel).length -
                                              2}
                                          </>
                                        ) : (
                                          <IoAddOutline className="w-4 h-4 font-semibold" />
                                        )
                                      ) : (
                                        <IoAddOutline className="w-4 h-4 font-semibold" />
                                      )}
                                    </Button>
                                  </DropdownTrigger>
                                  <DropdownMenu
                                    className="w-48 overflow-auto max-h-52 no-scrollbar dark:text-text"
                                    variant="flat"
                                    closeOnSelect={false}
                                    selectionMode="multiple"
                                    defaultSelectedKeys={cardLabel.map(
                                      (item) => item.id,
                                    )}
                                    onSelectionChange={(currentKey) => {
                                      setSelectedKeys(currentKey)
                                      handleSelectionChange(
                                        currentKey,
                                        updateId,
                                      )
                                    }}
                                  >
                                    {labels?.map((item) => (
                                      <DropdownItem
                                        key={item.id}
                                        style={{ backgroundColor: item.color }}
                                      >
                                        {item.name}
                                      </DropdownItem>
                                    ))}
                                  </DropdownMenu>
                                </Dropdown>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                              <BsPeopleFill className="text-lg text-cyan-500" />
                              Members
                            </span>
                            <Select
                              className="flex-1 max-w-[70%] dark:bg-gray-800"
                              classNames={{
                                trigger: "dark:bg-gray-800 dark:text-white",
                                value: "dark:text-white",
                              }}
                              items={assignedUserNames.map((user) => {
                                const isSelected = selectedUsers.includes(
                                  user.id,
                                )
                                return {
                                  key: user.id.toString(),
                                  ...user,
                                  selected: isSelected,
                                  value: user.id,
                                }
                              })}
                              selectedKeys={selectedUsers.map((user) =>
                                user.toString(),
                              )}
                              aria-label="select"
                              isMultiline
                              selectionMode="multiple"
                              placeholder="Add Members"
                              variant="bordered"
                              size="sm"
                              onSelectionChange={setUserId}
                              style={{ border: "none" }}
                              renderValue={(items) => {
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    <AvatarGroup
                                      size="sm"
                                      className="justify-start gap-2 ml-2"
                                      isBordered
                                      max={5}
                                      total={items.length}
                                      renderCount={(count) =>
                                        count > 5 ? (
                                          <Avatar
                                            isBordered
                                            size="sm"
                                            name={`+${count - 5}`}
                                            className="w-6 h-6"
                                          />
                                        ) : null
                                      }
                                    >
                                      {items.map((item) => (
                                        <Tooltip
                                          placement="bottom"
                                          showArrow
                                          size="sm"
                                          content={
                                            item.textValue.length > 25 ? (
                                              <>
                                                {item.textValue
                                                  .match(/.{1,25}/g)
                                                  .map((line, index) => (
                                                    <div key={index}>
                                                      {line}
                                                    </div>
                                                  ))}
                                              </>
                                            ) : (
                                              item.textValue
                                            )
                                          }
                                          key={item.key}
                                        >
                                          <Avatar
                                            size="sm"
                                            className="w-5 h-5"
                                            name={item.textValue.substring(
                                              0,
                                              1,
                                            )}
                                            src={item.data.photo}
                                            key={item.key}
                                          />
                                        </Tooltip>
                                      ))}
                                    </AvatarGroup>
                                  </div>
                                )
                              }}
                            >
                              {(user) => (
                                <SelectItem
                                  className="overflow-auto max-h-52 no-scrollbar"
                                  variant="solid"
                                  color="secondary"
                                  value={user.value}
                                  key={user.id}
                                  textValue={user.name}
                                  selected={user.selected}
                                >
                                  <div className="flex-column">
                                    <div className="flex items-center gap-2">
                                      <Avatar
                                        name={user.name.substring(0, 1)}
                                        src={user.photo}
                                        className="flex-shrink-0 text-lg"
                                        size="sm"
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-small">
                                          {user.name.length > 15
                                            ? `${user.name.substring(0, 15)}...`
                                            : user.name}
                                        </span>
                                        <span className="text-tiny">
                                          ({user.email})
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                              )}
                            </Select>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="flex items-center gap-0.5 text-sm font-semibold text-black dark:text-white">
                              <RiTeamLine className="w-6 h-5 text-lg text-indigo-500" />
                              Teams
                            </span>
                            <Select
                              className="flex-1 max-w-[70%] dark:bg-gray-800"
                              classNames={{
                                trigger: "dark:bg-gray-800 dark:text-white",
                                value: "dark:text-white",
                              }}
                              items={teams.map((team) => ({
                                key: team.id.toString(),
                                value: team.id,
                                name: team.name,
                              }))}
                              selectedKeys={selectedTeams.map((id) =>
                                id.toString(),
                              )}
                              aria-label="Select Teams"
                              isMultiline
                              selectionMode="multiple"
                              placeholder="Add Teams"
                              variant="bordered"
                              size="sm"
                              onSelectionChange={handleTeamSelection}
                              style={{ border: "none" }}
                            >
                              {(team) => (
                                <SelectItem
                                  key={team.id}
                                  value={team.id}
                                  textValue={team.name}
                                  color="secondary"
                                >
                                  {team.name}
                                </SelectItem>
                              )}
                            </Select>
                          </div>
                        </div>
                      </div>
                      <Divider className="mt-1 dark:bg-gray-700" />
                      <div className="flex justify-between mt-1">
                        <div className="flex font-semibold text-black text-md dark:text-white">
                          <MdDescription className="mt-1 text-lg text-orange-500" />
                          <span className="ml-2">Description</span>
                        </div>
                        {editorState && (
                          <div>
                            <MdEdit
                              className="text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              onClick={handleEditDesc}
                            />
                          </div>
                        )}
                      </div>
                      <div
                        className="border border-grey rounded min-h-[80px] max-h-[28vh] overflow-y-auto overflow-x-hidden dark:border-gray-700 dark:bg-gray-800"
                        style={{
                          fontFamily:
                            "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif",
                          display: editdesc ? "none" : "block",
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Edit Description"
                        onClick={handleEditDesc}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleEditDesc()
                          }
                        }}
                      >
                        <div className="p-2">
                          {" "}
                          <Editor
                            placeholder="Tap to add description..."
                            editorState={editorState}
                            onChange={setEditorState}
                            customStyleMap={styleMap}
                          />
                        </div>
                      </div>
                      {editdesc && (
                        <div>
                          <RichTextEditor
                            initialContentState={description}
                            onDescriptionChange={handleDescriptionChange}
                          />
                          <Button
                            variant="faded"
                            className="mt-2 bg-[#e4d4f4] text-[#7828c8] hover:bg-[#7828c8] hover:text-white font-semibold"
                            size="sm"
                            onPress={updateCard}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                      <input
                        type="file"
                        id="fileInput"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                        multiple
                      />
                      <Divider className="mt-2 dark:bg-gray-700" />
                      <div>
                        <ChecklistSection
                          cardId={updateId.toString()}
                          cardName={data.name}
                          onActivityLog={handleActivityLog}
                          onDependencyUpdate={refreshDependencies}
                        />
                        <Divider className="mt-2 mb-2 dark:bg-gray-700" />
                        <div className="flex gap-1 mt-2 mb-2 font-semibold text-black dark:text-white">
                          <SiDependencycheck className="mt-1 text-lg text-rose-500" />
                          <span className="ml-1">Dependencies</span>
                          <Button
                            variant="faded"
                            className="ml-auto bg-[#e4d4f4] text-[#7828c8] hover:bg-[#7828c8] hover:text-white font-semibold"
                            size="sm"
                            onClick={() => setIsDependencyModalOpen(true)}
                          >
                            Add Dependencies
                          </Button>
                        </div>

                        <div className="flex flex-col w-full gap-4 mt-2 ml-4">
                          <div className="flex flex-col gap-2 ml-3">
                            <span className="text-sm font-medium text-gray-600 dark:text-white">
                              Blockers:
                            </span>
                            <ScrollShadow className="max-h-[120px]">
                              <div className="flex flex-wrap gap-2">
                                {blockers.map((blocker) => (
                                  <Chip
                                    size="sm"
                                    key={blocker.id}
                                    variant="flat"
                                    color={
                                      blocker.isCompleted
                                        ? "success"
                                        : "warning"
                                    }
                                    className="transition-opacity cursor-pointer hover:opacity-80"
                                    onClick={() =>
                                      handleCardNavigation(blocker.id)
                                    }
                                    startContent={
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          blocker.isCompleted
                                            ? "bg-success"
                                            : "bg-warning"
                                        }`}
                                      />
                                    }
                                  >
                                    {blocker.name}
                                  </Chip>
                                ))}
                              </div>
                            </ScrollShadow>
                          </div>
                          <div className="flex flex-col gap-2 ml-3">
                            <span className="text-sm font-medium text-gray-600 dark:text-white">
                              Blocking:
                            </span>
                            <ScrollShadow className="max-h-[120px]">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {blockedBy.map((blocked) => (
                                  <Chip
                                    size="sm"
                                    key={blocked.id}
                                    variant="flat"
                                    color="secondary"
                                    className="transition-opacity cursor-pointer hover:opacity-80"
                                    onClick={() =>
                                      handleCardNavigation(blocked.id)
                                    }
                                    startContent={
                                      <div className="w-2 h-2 rounded-full bg-secondary" />
                                    }
                                  >
                                    {blocked.name}
                                  </Chip>
                                ))}
                              </div>
                            </ScrollShadow>
                          </div>
                        </div>

                        <DependencyModal
                          isOpen={isDependencyModalOpen}
                          onClose={() => setIsDependencyModalOpen(false)}
                          updateId={updateId}
                          blockers={blockers}
                          blockedBy={blockedBy}
                          onActivityLog={handleActivityLog}
                        />
                        <Divider className="mt-2 mb-2 dark:bg-gray-700" />

                        <div className="flex mt-2 mb-2 font-semibold text-black dark:text-white">
                          <IoAttachOutline className="w-5 h-5 mt-1 mr-1 text-lg text-amber-500" />
                          Attachments
                        </div>
                        <Button
                          size="sm"
                          variant="faded"
                          onPress={handleButtonClick}
                          aria-label="Attach File"
                          className="w-full mb-2"
                          onDrop={(e) => {
                            e.preventDefault()
                            const droppedFile = e.dataTransfer.files[0]
                            handleDroppedFile(droppedFile)
                          }}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          Drag/Drop or Tap to add images
                        </Button>
                        <div
                          className="flex flex-row flex-wrap max-w-full gap-2"
                          onDrop={(e) => {
                            e.preventDefault()
                            const droppedFile = e.dataTransfer.files[0]
                            handleDroppedFile(droppedFile)
                          }}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <div className="flex flex-wrap gap-2">
                            {attachment &&
                              attachment
                                .filter((currentAttachment) => {
                                  const fileType = currentAttachment.name
                                    .split(".")
                                    .pop()
                                    .toLowerCase()
                                  return ["jpg", "jpeg", "png", "gif"].includes(
                                    fileType,
                                  )
                                })
                                .map((currentAttachment, index) => (
                                  <div
                                    className="flex gap-2 mt-2 border-solid border-[1px] border-grey-100 rounded"
                                    key={currentAttachment.id}
                                  >
                                    <div className="flex gap-3 cursor-pointer">
                                      <div className="flex flex-col">
                                        <div
                                          style={{
                                            position: "relative",
                                            display: "inline-block",
                                          }}
                                          onMouseEnter={() =>
                                            handleHover(index, true)
                                          }
                                          onMouseLeave={() =>
                                            handleHover(index, false)
                                          }
                                        >
                                          <Card
                                            radius="none"
                                            className="border-none"
                                          >
                                            <div className="relative group">
                                              <img
                                                src={currentAttachment.file}
                                                alt="Attachment"
                                                style={{
                                                  display: "block",
                                                  height: "120px",
                                                  width: "150px",
                                                }}
                                              />
                                              <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(0, 0, 0, 0.5)",
                                                }}
                                              />
                                              {hoveredAttachmentIndex ===
                                                index && (
                                                <div
                                                  style={{
                                                    position: "absolute",
                                                    top: "20%",
                                                    left: "70%",
                                                    transform:
                                                      "translate(-50%, -50%)",
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <a
                                                    href={
                                                      currentAttachment.file
                                                    }
                                                    download={`${currentAttachment.name}`}
                                                    className="justify-center"
                                                  >
                                                    <MdOutlineFileDownload
                                                      size={24}
                                                      style={{
                                                        marginRight: "5px",
                                                        opacity: 0.8,
                                                        color: "white",
                                                      }}
                                                    />
                                                  </a>
                                                  <BiSolidTrashAlt
                                                    size={24}
                                                    style={{
                                                      marginRight: "5px",
                                                      opacity: 0.8,
                                                      color: "white",
                                                    }}
                                                    onClick={() => {
                                                      handleDelete(
                                                        currentAttachment.name,
                                                        currentAttachment.id,
                                                      )
                                                    }}
                                                  />
                                                  <IoEyeOutline
                                                    size={24}
                                                    onClick={() =>
                                                      toggleModal(index)
                                                    }
                                                    style={{
                                                      opacity: 0.8,
                                                      color: "white",
                                                    }}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </Card>
                                        </div>
                                        <div
                                          className="p-1 text-sm font-semibold"
                                          style={{
                                            maxWidth: "150px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {currentAttachment.name}
                                        </div>
                                        <div className="pl-1 text-xs">
                                          {new Date(
                                            currentAttachment.time,
                                          ).toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                          })}{" "}
                                          {new Date(
                                            currentAttachment.time,
                                          ).toLocaleTimeString("en-US", {
                                            hour: "numeric",
                                            minute: "numeric",
                                            hour12: true,
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                    <Modal
                                      isOpen={isOpen[index]}
                                      onOpenChange={() => toggleModal(index)}
                                      className=" pointer"
                                      hideCloseButton
                                      size="xl"
                                    >
                                      <ModalContent>
                                        <ModalBody className="p-0">
                                          <img
                                            src={currentAttachment.file}
                                            height="600px"
                                            width="600px"
                                            alt="attachment"
                                          />
                                        </ModalBody>
                                      </ModalContent>
                                    </Modal>
                                  </div>
                                ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <div>
                              {attachment &&
                                attachment
                                  .filter((currentAttachment) => {
                                    const fileType = currentAttachment.name
                                      .split(".")
                                      .pop()
                                      .toLowerCase()
                                    return [
                                      "pdf",
                                      "docx",
                                      "xlsx",
                                      "csv",
                                    ].includes(fileType)
                                  })
                                  .map((currentAttachment, index) => (
                                    <div key={currentAttachment.id}>
                                      <div
                                        className="flex gap-2 mt-2 border-solid border-[1px] border-grey-100 rounded relative group"
                                        onMouseEnter={() =>
                                          handleFileHover(index, true)
                                        }
                                        onMouseLeave={() =>
                                          handleFileHover(index, false)
                                        }
                                      >
                                        <div className="p-1 text-sm font-semibold">
                                          <a
                                            href={currentAttachment.file}
                                            download={`${currentAttachment.name}`}
                                            className="text-blue-600 hover:underline"
                                          >
                                            {currentAttachment.name}
                                          </a>
                                        </div>
                                        <div>
                                          {hoveredFileIndex === index && (
                                            <div
                                              style={{
                                                position: "absolute",
                                                left: "100%",
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                              }}
                                            >
                                              <BiSolidTrashAlt
                                                size={24}
                                                style={{
                                                  marginRight: "5px",
                                                  opacity: 0.8,
                                                  color: "black",
                                                }}
                                                onClick={() => {
                                                  handleDelete(
                                                    currentAttachment.name,
                                                    currentAttachment.id,
                                                  )
                                                }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {attachment &&
                              attachment
                                .filter((currentAttachment) => {
                                  const fileType = currentAttachment.name
                                    .split(".")
                                    .pop()
                                    .toLowerCase()
                                  return [
                                    "mp4",
                                    "avi",
                                    "mov",
                                    "mkv",
                                    "webm",
                                    "3gp",
                                    "m4v",
                                  ].includes(fileType)
                                })

                                .map((currentAttachment, index) => (
                                  <div
                                    className="flex gap-2 mt-2 border-solid border-[1px] border-grey-100 rounded"
                                    key={currentAttachment.id}
                                  >
                                    <div
                                      className="flex gap-2 mt-2 border-solid border-[1px] border-grey-100 rounded relative group"
                                      onMouseEnter={() =>
                                        handleVideoHover(index, true)
                                      }
                                      onMouseLeave={() =>
                                        handleVideoHover(index, false)
                                      }
                                    >
                                      <div className="p-1 text-sm font-semibold">
                                        <a
                                          href={currentAttachment.file}
                                          download={`${currentAttachment.name}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          {}
                                        </a>
                                      </div>
                                      <div className="relative group">
                                        <video
                                          width="320"
                                          height="240"
                                          controls
                                        >
                                          <source
                                            src={currentAttachment.file}
                                          />
                                          <track
                                            kind="captions"
                                            src="path_to_captions.vtt"
                                            srclang="en"
                                            label="English captions"
                                          />
                                          Your browser does not support the
                                          video tag.
                                        </video>

                                        {hoveredVideoIndex === index && (
                                          <div
                                            style={{
                                              position: "absolute",
                                              top: "15%",
                                              left: "80%",
                                              paddingLeft: "20px",
                                              transform:
                                                "translate(-50%, -50%)",
                                              display: "flex",
                                            }}
                                          >
                                            <a
                                              href={currentAttachment.file}
                                              download={`${currentAttachment.name}`}
                                              className="mr-2"
                                            >
                                              <MdOutlineFileDownload
                                                size={24}
                                                style={{
                                                  opacity: 0.8,
                                                  color: "black",
                                                }}
                                              />
                                            </a>
                                            <BiSolidTrashAlt
                                              size={24}
                                              className="mr-2"
                                              style={{
                                                opacity: 0.8,
                                                color: "black",
                                              }}
                                              onClick={() => {
                                                handleDelete(
                                                  currentAttachment.name,
                                                  currentAttachment.id,
                                                )
                                              }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        {alert && (
                          <div
                            className="flex justify-between p-2 text-red-800 bg-red-100 rounded "
                            role="alert"
                          />
                        )}
                        {typeError && (
                          <div
                            className="flex justify-between p-2 text-red-800 bg-red-100 rounded "
                            role="alert"
                          />
                        )}
                      </div>
                    </ModalBody>
                  </div>
                </div>

                <div className="flex flex-col w-5/12 h-full">
                  <div
                    className="flex flex-col flex-grow overflow-hidden border border-grey rounded-xl dark:border-none max-h-70vh"
                    style={{ position: "relative" }}
                  >
                    <div className="flex justify-around border-b border-gray-300">
                      <button
                        type="button"
                        className={`p-2 text-sm font-medium ${
                          selectedTab === "activity"
                            ? "border-b-2 border-blue-500"
                            : ""
                        }`}
                        onClick={() => setSelectedTab("activity")}
                      >
                        <RxActivityLog className="inline-block mr-1" /> Activity
                      </button>
                      <button
                        type="button"
                        className={`p-2 text-sm font-medium ${
                          selectedTab === "comments"
                            ? "border-b-2 border-blue-500"
                            : ""
                        }`}
                        onClick={() => setSelectedTab("comments")}
                      >
                        <FaComments className="inline-block mr-1" /> Comments
                      </button>
                    </div>
                    <div
                      className="flex-grow p-4 overflow-y-auto"
                      style={{ maxHeight: "calc(100% - 4rem)" }}
                    >
                      {selectedTab === "activity" && (
                        <div>
                          <div className="flex justify-end mb-2">
                            <button
                              type="button"
                              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                              onClick={() => setShowActivities((prev) => !prev)}
                            >
                              {showActivities ? (
                                <>
                                  <FaAngleUp className="text-base" /> Hide
                                </>
                              ) : (
                                <>
                                  <FaAngleDown className="text-base" /> Show
                                  More
                                </>
                              )}
                            </button>
                          </div>
                          {combinedLogs
                            .filter((log) => {
                              if (log.type !== "activity") return false
                              return Object.keys(
                                preferenceToEventTypeMapping,
                              ).some((prefKey) => {
                                if (notificationPreferences[prefKey] === true) {
                                  return preferenceToEventTypeMapping[
                                    prefKey
                                  ].includes(log.eventType)
                                }
                                return false
                              })
                            })
                            .slice(0, showActivities ? combinedLogs.length : 5)
                            .map((log) => (
                              <div
                                key={log.id}
                                className="flex items-center justify-between gap-2 mb-3"
                              >
                                <div className="flex-1">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {renderMessage(log.details)}
                                  </p>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatTime(log.createdAt)}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {selectedTab === "comments" && (
                        <div>
                          {combinedLogs
                            .filter((log) => log.type === "comment")
                            .map((log) => (
                              <div
                                key={log.id}
                                className="relative px-3 pt-3 pb-2 mb-2 border border-gray-300 rounded-lg"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Avatar
                                        className="w-6 h-6 text-sm font-semibold text-white bg-secondary"
                                        radius="full"
                                        size="sm"
                                        src={log.user?.photo || undefined}
                                        name={
                                          !log.user?.photo
                                            ? getUserInitials(
                                                log.user?.name ||
                                                  log.user?.email ||
                                                  "User",
                                              )
                                            : undefined
                                        }
                                      />

                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {log.user?.name}
                                      </span>
                                    </div>
                                    <p className="absolute text-xs text-gray-500 top-2 right-3">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="mt-2">
                                    <p
                                      className="text-sm text-gray-700 dark:text-gray-300"
                                      dangerouslySetInnerHTML={{
                                        __html: log.description
                                          .replace(
                                            /\*\*(.*?)\*\*/g,
                                            "<strong>$1</strong>",
                                          )
                                          .replace(
                                            /@(\w+)/g,
                                            '<span style="color: #9b59b6;">@$1</span>',
                                          )
                                          .replace(
                                            /(https?:\/\/[^\s]+)/g,
                                            '<a href="$1" class="text-blue-500 underline" target="_blank" rel="noopener noreferrer">$1</a>',
                                          ),
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-200">
                                    <div
                                      className="flex items-center gap-1 cursor-pointer"
                                      onClick={() => handleCommentLike(log.id)}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          handleCommentLike(log.id)
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}
                                    >
                                      {log.isLiked ? (
                                        <FaThumbsUp className="text-secondary hover:text-secondary-dark" />
                                      ) : (
                                        <FaRegThumbsUp className="text-gray-600 hover:text-secondary" />
                                      )}
                                      <span
                                        className={`text-sm font-medium ${
                                          log.isLiked
                                            ? "text-secondary"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {log.likes}
                                      </span>
                                    </div>
                                    <span
                                      onClick={() => handleReply(log.id)}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          handleReply(log.id)
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      className="flex items-center gap-1 text-sm cursor-pointer text-secondary hover:text-secondary-dark"
                                    >
                                      <BsReply className="text-base" />
                                      <span>Reply</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-4 ml-10">
                                  {log.replies?.map((reply) => (
                                    <div
                                      key={reply.id}
                                      className="relative flex flex-col gap-2 pb-1 mb-2 border-b border-gray-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar
                                          className="w-6 h-6 text-sm font-semibold text-white bg-secondary"
                                          radius="full"
                                          size="sm"
                                          src={log.user?.photo || undefined}
                                          name={
                                            !log.user?.photo
                                              ? getUserInitials(
                                                  log.user?.name ||
                                                    log.user?.email ||
                                                    "User",
                                                )
                                              : undefined
                                          }
                                        />

                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          {reply.user?.name}
                                        </span>
                                      </div>
                                      <p className="absolute text-xs text-gray-500 top-2 right-3">
                                        {new Date(
                                          reply.createdAt,
                                        ).toLocaleString()}
                                      </p>
                                      <div className="flex items-center justify-between mt-1">
                                        <p
                                          className="text-sm text-gray-700 dark:text-gray-300"
                                          dangerouslySetInnerHTML={{
                                            __html: reply.description
                                              .replace(
                                                /\*\*(.*?)\*\*/g,
                                                "<strong>$1</strong>",
                                              )
                                              .replace(
                                                /(https?:\/\/[^\s]+)/g,
                                                '<a href="$1" class="text-blue-500 underline" target="_blank" rel="noopener noreferrer">$1</a>',
                                              ),
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                  {replyingTo === log.id && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <div className="relative flex-grow">
                                        <input
                                          type="text"
                                          value={replyText}
                                          onChange={(e) =>
                                            setReplyText(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" &&
                                              replyText.trim()
                                            )
                                              handleAddReply(log.id)
                                          }}
                                          placeholder="Write a reply..."
                                          className="w-full p-2 pr-12 text-sm border rounded"
                                          style={{ height: "2.5rem" }}
                                        />
                                        <div className="absolute transform -translate-y-1/2 top-1/2 right-3">
                                          <Button
                                            type="button"
                                            onClick={() =>
                                              handleAddReply(log.id)
                                            }
                                            variant="solid"
                                            color="secondary"
                                            size="sm"
                                            className={`${
                                              !replyText.trim()
                                                ? "bg-purple-300 text-purple-500"
                                                : "bg-secondary text-white"
                                            }`}
                                            style={{
                                              height: "2rem",
                                              padding: "0 1rem",
                                            }}
                                          >
                                            <MdSend />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    {selectedTab === "comments" && (
                      <div className="relative flex flex-col w-full">
                        <div className="relative flex items-center w-full">
                          <input
                            type="text"
                            value={newComment}
                            onChange={handleCommentChange}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                isPoperOpen &&
                                filteredUsers.length > 0
                              ) {
                                e.preventDefault()
                                const firstUser = filteredUsers[0].name
                                handleClick(firstUser)
                              } else if (
                                e.key === "Enter" &&
                                newComment.trim()
                              ) {
                                handleAddComment()
                              }
                            }}
                            placeholder="Add a comment..."
                            className="w-full p-3 pr-16 text-sm border rounded"
                          />
                          <div className="relative">
                            <Button
                              type="button"
                              onClick={handleAddComment}
                              variant="solid"
                              color="secondary"
                              size="sm"
                              className={`absolute transform -translate-y-1/2 right-3 top-1/2 ${
                                !newComment.trim()
                                  ? "bg-purple-300 text-purple-600"
                                  : "bg-secondary text-white"
                              }`}
                            >
                              <MdSend />
                            </Button>
                          </div>
                        </div>

                        {filteredUsers.length > 0 && isPoperOpen && (
                          <div className="absolute bottom-14 left-2 w-[19rem] z-50 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-xl overflow-y-auto max-h-56">
                            {filteredUsers.map((user) => (
                              <div
                                key={user.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleClick(user.name)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    handleClick(user.name)
                                  }
                                }}
                                className="flex items-start w-full p-1 py-2 transition duration-200 cursor-pointer group hover:bg-purple-700 hover:text-black rounded-2xl"
                              >
                                <Avatar className="w-7 h-7" src={user.photo}>
                                  {user.name[0]}
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800 dark:text-white">
                                    {user.name}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-300 ">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalContent>
    </Modal>
  )
}

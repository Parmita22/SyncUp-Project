/* eslint-disable  @typescript-eslint/no-unused-vars, import/extensions, import/no-unresolved,  no-use-before-define, no-console, no-shadow */
import { useEffect, useState } from "react"
import { pipe } from "fp-ts/lib/function"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { showErrorToast } from "@/src/utils/toastUtils"
import GetSyncupData from "@/server/GetSyncupData"
import { getAllboards } from "@/server/board"
import { fetchOrganizationName } from "@/server/organization"
import { fetchTeams } from "@/server/team"

export interface SyncupData {
  activeCardCount: number
  archivedCardCount: number
  id: number
  title: string
  color: string
  cards: {
    release: string
    attachments: any
    comments: any
    id: number
    name: string
    description: string
    photo: string
    order: number
    dueDate: Date
    isCompleted: boolean
    priority: string
    status: string
    assignedUsers: {
      name: string
      email: string
      photo: string
    }[]
    label?: {
      id: string
      name: string
      color: string
    }[]
    tasks: {
      user: string
      assignedUserSearch: string
      setAssignedUserSearch: (value: string) => void
      teams: { name: string; id: number }[]
    }
    checklistItems?: ChecklistItem[]
    blockers?: CardDependency[]
    blockedBy?: CardDependency[]
  }[]
  comments?: {
    id: number
    description: string
  }[]
  attachments?: {
    id: number
  }[]
}

export interface ChecklistItem {
  id: number
  title: string
  isComplete: boolean
  cardId: number
}

export interface CardDependency {
  id: number
  blockerId: number
  blockedId: number
  name?: string
}

export interface LabelData {
  id: string
  name: string
  color: string
}

export interface AllUserData {
  id: number
  name: string
  email: string
  role: any
  notifications: any
}

export interface BoardData {
  organizationId: any
  users: any
  id: number
  name: string
  background: string
  visibility: any
  labels: LabelData[]
}

export interface UserData {
  id: number
  email: string
  name: string
  role: any
  photo: string
}

export interface UseSyncupFilters {
  tableupdate: boolean
  setTableUpdate: (value: boolean) => void
  member: string[]
  data: SyncupData[]
  labels: LabelData[]
  allUserData: AllUserData[]
  boardData: BoardData[]
  setData: (value: SyncupData[]) => void
  setLabels: (value: LabelData[]) => void
  setAllUserData: (value: AllUserData[]) => void
  setBoardData: (value: BoardData[]) => void
  setMember: (value: string[]) => void
  setCardState: (value: string) => void
  setSearchState: (value: string) => void
  searchState: string
  cardState: string
  setFilterState: (value: FilterState) => void
  filterState: FilterState
  setLoad: (value: boolean) => void
  load: boolean
  TableView: boolean
  setUserUpdate: (value: boolean) => void
  userUpdate: boolean
  setTableView: (value: boolean) => void
  categoryLoad: boolean
  setCategoryLoad: (value: boolean) => void
  userInfo: UserData
  setUserInfo: (value: UserData) => void
  assignedUserNames: string[]
  setAssignedUserNames: (value: string[]) => void
  setDefaultLoad: (value: boolean) => void
  defaultload: boolean
  updateboard: boolean
  setudpateboard: (value: boolean) => void
  notifications: number
  setnotifications: (value: number) => void
  createnotification: boolean
  setcreatenotification: (value: boolean) => void
  update: boolean
  setUpdateOrg: (value: boolean) => void
  updateOrg: boolean
  setupdate: (value: boolean) => void
  organizationname: string[]
  setOrganizationname: (value: string[]) => void
  photoupdate: boolean
  setPhotoUpdate: (value: boolean) => void
  labelupdate: boolean
  setLabelUpdate: (value: boolean) => void
  assignedUserSearch: string
  setAssignedUserSearch: (value: string) => void
  teams: { name: string; id: number }[]
  selectedCards: number[]
  setSelectedCards: (value: number[]) => void
}

export interface FilterState {
  specificTeam: string
  due: boolean
  dueDate: boolean
  overdue: boolean
  dueNextDay: boolean
  dueNextWeek: boolean
  dueNextMonth: boolean
  label: string
  specificLabel: string
  member: boolean
  assignedToMe: boolean
  isMarkedAsCompleted: boolean
  isMarkedAsInCompleted: boolean
  specificMember: string
  priority: string
}

export function useSyncupFilter(): UseSyncupFilters {
  const [data, setData] = useState<SyncupData[]>()
  const [member, setMember] = useState<string[]>([])
  const [cardState, setCardState] = useState<string | undefined>()
  const [searchState, setSearchState] = useState<string | undefined>()
  const [tableupdate, setTableUpdate] = useState(false)
  const { data: session } = useSession()
  const uemail = session && session.user ? session.user.email : null
  const [load, setLoad] = useState(false)
  const [userUpdate, setUserUpdate] = useState(false)
  const [defaultload, setDefaultLoad] = useState(true)
  const [categoryLoad, setCategoryLoad] = useState(false)
  const [update, setupdate] = useState(false)
  const [firstBoardID, setfirstboardId] = useState(null)
  const [TableView, setTableView] = useState(false)
  const [labels, setLabels] = useState<LabelData[]>([])
  const [allUserData, setAllUserData] = useState<AllUserData[]>([])
  const [boardData, setBoardData] = useState<BoardData[]>([])
  const [userInfo, setUserInfo] = useState<UserData>()
  const [updateboard, setudpateboard] = useState(false)
  const [createnotification, setcreatenotification] = useState(true)
  const [notifications, setnotifications] = useState(0)
  const [updateOrg, setUpdateOrg] = useState(false)
  const [organizationname, setOrganizationname] = useState([])
  const [assignedUserNames, setAssignedUserNames] = useState([])
  const [photoupdate, setPhotoUpdate] = useState(false)
  const [labelupdate, setLabelUpdate] = useState(false)
  const [teams, setTeams] = useState<{ name: string; id: number }[]>([])
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const [filterState, setFilterState] = useState<FilterState>({
    due: false,
    dueDate: false,
    overdue: false,
    dueNextDay: false,
    dueNextWeek: false,
    dueNextMonth: false,
    label: "",
    specificLabel: "",
    member: false,
    assignedToMe: false,
    isMarkedAsCompleted: false,
    isMarkedAsInCompleted: false,
    specificMember: "",
    priority: "",
    specificTeam: "",
  })
  const [assignedUserSearch, setAssignedUserSearch] = useState<string>("")

  const board = useParams()

  const fetchBoards = async () => {
    if (session?.user.email !== undefined) {
      const fetchedBoards = await getAllboards(
        session.user.email,
        board.organization,
      )
      setDefaultLoad(false)
      const sortedBoards = fetchedBoards.sort((a, b) => a.id - b.id)
      setBoardData(sortedBoards)
      setudpateboard(false)
      setLabelUpdate(false)
      if (sortedBoards.length > 0) {
        const firstBoard = sortedBoards[0]
        setfirstboardId(firstBoard.id.toString())
      } else {
        console.warn("No boards available")
        setfirstboardId(null)
      }
    }
  }
  useEffect(() => {
    fetchBoards()
  }, [labelupdate, session, board.organization])
  useEffect(() => {
    if (updateboard === true) {
      fetchBoards()
    }
  }, [updateboard, board.organization])
  const boardIdToUse = board.id !== undefined ? board.id : firstBoardID
  useEffect(() => {
    const fetchData = async () => {
      try {
        const updatedData = await GetSyncupData(boardIdToUse)
        setData(updatedData)
        setTableUpdate(false)
      } catch (error) {
        showErrorToast("Error fetching data")
      }
    }
    if (boardIdToUse) {
      fetchData()
    }
  }, [boardIdToUse, session])
  useEffect(() => {
    const fetchAndSetTeams = async () => {
      try {
        if (!boardIdToUse || Number.isNaN(parseInt(boardIdToUse, 10))) {
          console.error("Invalid boardId provided to fetchTeams")
          return
        }
        const fetchedTeams = await fetchTeams(boardIdToUse)
        setTeams(fetchedTeams)
      } catch (error) {
        console.log(error)
        showErrorToast("Error fetching teams")
      }
    }

    fetchAndSetTeams()
  }, [boardIdToUse])
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (session?.user.email !== undefined) {
          const orgNameeee = await fetchOrganizationName(session?.user.email)
          setUserInfo(orgNameeee)
          setOrganizationname(orgNameeee.organizations)
          setUpdateOrg(false)
          setPhotoUpdate(false)
          setUserUpdate(false)
        }
      } catch (error) {
        showErrorToast("Error fetching organization name ")
      }
    }
    fetchOrganization()
  }, [session, photoupdate, createnotification, userUpdate, board.organization])

  useEffect(() => {
    const fetchLabels = async () => {
      if (boardIdToUse !== null && boardData.length > 0) {
        const labelsData = boardData.find(
          (b) => b.id === parseInt(boardIdToUse, 10),
        )
        setLabels(labelsData.labels)
      }
    }
    fetchLabels()
  }, [session, boardIdToUse, boardData])

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        if (organizationname.length === 0) return
        const allUserInfo = organizationname.find(
          (org) => org.name === board.organization,
        )?.users
        setAllUserData(allUserInfo)
        setUserUpdate(false)
      } catch (error) {
        showErrorToast("Error fetching label")
      }
    }

    fetchAllUsers()
  }, [userUpdate, createnotification, userInfo])

  useEffect(() => {
    const getUsersByBoardId = async () => {
      if (boardIdToUse !== null) {
        if (boardData.length !== 0) {
          const boardUser = boardData.find(
            (b) => b.id === parseInt(boardIdToUse, 10),
          )?.users
          if (boardUser) {
            setAssignedUserNames(boardUser)
          }
        }
      }
      return null
    }
    getUsersByBoardId()
  }, [session, boardIdToUse, boardData])

  const fetchAndSetUnreadNotifications = async () => {
    try {
      if (allUserData.length === 0) return

      const user1 = allUserData.find(
        (user) => user.email === session?.user.email,
      )
      if (!user1) {
        console.error("User not found")
        return
      }

      const unreadNotifications = user1.notifications.filter(
        (notification) => notification.status === "UNREAD",
      )
      console.log(unreadNotifications.length)

      setnotifications(unreadNotifications.length)
    } catch (error) {
      showErrorToast("Error fetching notifications")
    }

    setcreatenotification(true)
  }

  useEffect(() => {
    if (uemail !== null) {
      fetchAndSetUnreadNotifications()
    }
  }, [uemail, createnotification])
  const isOverdue = (dueDate: Date) => {
    const today = new Date()
    return dueDate < today
  }
  const isDueNextDay = (dueDate: Date) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return (
      dueDate.getFullYear() === tomorrow.getFullYear() &&
      dueDate.getMonth() === tomorrow.getMonth() &&
      dueDate.getDate() === tomorrow.getDate()
    )
  }

  const isDueNextWeek = (dueDate: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const oneWeekFromToday = new Date(today)
    oneWeekFromToday.setDate(today.getDate() + 7)

    return dueDate > today && dueDate <= oneWeekFromToday
  }

  const isDueNextMonth = (dueDate: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentMonth = today.getMonth()
    const nextMonth = new Date(today.getFullYear(), currentMonth + 1, 1)
    const monthAfterNext = new Date(today.getFullYear(), currentMonth + 2, 1)

    return dueDate >= nextMonth && dueDate < monthAfterNext
  }

  function applyCheckboxFilters(card: any) {
    return (
      card.label !== undefined &&
      card.label !== "" &&
      (!filterState.dueDate || card.dueDate) &&
      (!filterState.overdue || isOverdue(card.dueDate)) &&
      (!filterState.dueNextDay || isDueNextDay(card.dueDate)) &&
      (!filterState.dueNextWeek || isDueNextWeek(card.dueDate)) &&
      (!filterState.dueNextMonth || isDueNextMonth(card.dueDate)) &&
      (!filterState.label || (card.label && card.label.length > 0)) &&
      (!filterState.specificLabel ||
        card.label.some((label) => label.name === filterState.specificLabel)) &&
      (!filterState.isMarkedAsCompleted || card.isCompleted) &&
      (!filterState.isMarkedAsInCompleted || !card.isCompleted) &&
      (!filterState.priority || card.priority === filterState.priority) &&
      (!filterState.specificTeam ||
        card.assignedTeams.some(
          (team) =>
            team.name?.toLowerCase() === filterState.specificTeam.toLowerCase(),
        )) &&
      (!assignedUserSearch ||
        card.assignedUsers?.some((user) =>
          user.name?.toLowerCase().includes(assignedUserSearch.toLowerCase()),
        ))
    )
  }
  function SearchCardsByTitleLabelMembers<T extends SyncupData>(
    cardColumns: T[],
  ): T[] {
    return cardColumns?.map((column) => {
      const filteredCards = column.cards.filter((card) =>
        cardState
          ? card.name.toLowerCase().includes(cardState.toLowerCase()) ||
            card.label.some((label) =>
              label.name.toLowerCase().includes(cardState.toLowerCase()),
            )
          : true,
      )
      return { ...column, cards: filteredCards }
    })
  }

  function SearchLabelsByName<T extends LabelData>(Labels: T[]): T[] {
    return Labels.filter((label) => {
      return searchState
        ? label.name.toLowerCase().includes(searchState.toLowerCase())
        : true
    })
  }

  function SearchBoardByName<T extends BoardData>(boardList: T[]): T[] {
    return boardList.filter((boardItem) => {
      return searchState
        ? boardItem.name.toLowerCase().includes(searchState.toLowerCase())
        : true
    })
  }

  function takeCardsByCheckboxes(
    dataToProcess: SyncupData[] | undefined,
  ): SyncupData[] {
    if (!dataToProcess) {
      return []
    }
    return data.map((column) => ({
      ...column,
      cards: column.cards.filter(applyCheckboxFilters),
    }))
  }

  function SearchMemberByName<T extends AllUserData>(AllUserData: T[]): T[] {
    return AllUserData?.filter((user) => {
      return searchState
        ? user.name.toLowerCase().includes(searchState.toLowerCase())
        : true
    })
  }

  return {
    data: pipe(data, takeCardsByCheckboxes, SearchCardsByTitleLabelMembers),
    labels: pipe(labels, SearchLabelsByName),
    boardData: pipe(boardData, SearchBoardByName),
    tableupdate,
    setTableUpdate,
    allUserData: pipe(allUserData, SearchMemberByName),
    setAllUserData,
    setData,
    setLabels,
    searchState,
    setSearchState,
    member,
    setMember,
    setCardState,
    setFilterState,
    filterState,
    cardState,
    setLoad,
    load,
    setUserUpdate,
    userUpdate,
    TableView,
    setTableView,
    categoryLoad,
    setCategoryLoad,
    setBoardData,
    userInfo,
    setUserInfo,
    assignedUserNames,
    setAssignedUserNames,
    setDefaultLoad,
    defaultload,
    updateboard,
    setudpateboard,
    notifications,
    setnotifications,
    createnotification,
    setcreatenotification,
    update,
    setupdate,
    updateOrg,
    setUpdateOrg,
    organizationname,
    setOrganizationname,
    photoupdate,
    setPhotoUpdate,
    labelupdate,
    setLabelUpdate,
    assignedUserSearch,
    setAssignedUserSearch,
    teams,
    selectedCards,
    setSelectedCards,
  }
}

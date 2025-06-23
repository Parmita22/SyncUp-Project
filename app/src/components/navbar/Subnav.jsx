"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Checkbox,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Button,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react"
import { useTheme } from "next-themes"
import {
  MdIncompleteCircle,
  MdOutlineKeyboardArrowRight,
  MdLabelOutline,
  MdOutlineFileUpload,
} from "react-icons/md"
import {
  IoCheckmarkDoneCircleOutline,
  IoFilterOutline,
  IoCloseOutline,
  IoShareSocial,
} from "react-icons/io5"
import { GoClock } from "react-icons/go"
import { IoIosSearch } from "react-icons/io"
import { useParams, usePathname, useRouter } from "next/navigation"
import {
  WhatsappShareButton,
  WhatsappIcon,
  LinkedinShareButton,
  LinkedinIcon,
  EmailShareButton,
  EmailIcon,
  FacebookShareButton,
  FacebookIcon,
  TelegramShareButton,
  TelegramIcon,
  TwitterShareButton,
  TwitterIcon,
} from "next-share"
import * as XLSX from "xlsx"
import { useSession } from "next-auth/react"
import { getPriorityIcon } from "@/src/utils/priorityUtlis"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"
import { processSheetRows } from "@/server/uploadCardsFromSheet"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"

export default function Subnav() {
  const [isSmallViewport, setIsSmallViewport] = useState(false)
  const [selectedMember, setSelectedMember] = useState("")
  const {
    data,
    setData,
    assignedUserNames,
    cardState,
    setCardState,
    setSearchState,
    filterState,
    setFilterState,
    setTableView,
    labels,
    setLabels,
    boardData,
    assignedUserSearch,
    setAssignedUserSearch,
    teams,
  } = useGlobalSyncupContext()
  const { theme } = useTheme()
  const org = useParams()
  const projectPages = ["/projectsetting", "/board"]
  const pathname = usePathname()
  const homeserachBar =
    pathname.includes("/home") ||
    pathname.includes(`${org.organization}/board/${org.id}`)
  const isInProjectPages = projectPages.includes(pathname)
  const router = useRouter()
  const [boardId, setboardId] = useState()
  const { data: session } = useSession()

  const popoverRef = useRef(null)
  const [selectedKeys, setSelectedKeys] = React.useState(new Set([]))
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = React.useState(new Set([]))
  const [isModalOpen1, setModalOpen] = useState(false)
  const isSlackIntegrationPage = pathname.includes("/integration")
  const filterOptions = [
    "Keywords",
    "Members",
    "Cards assigned to Me",
    "DueDate",
    "Overdue",
    "Due to Next Day",
    "Due to Next Week",
    "Due to Next Month",
    "Marked as Completed",
    "Marked as Incompleted",
    "Labels",
    "selectmembers",
    "selectlabels",
    "priority",
    "Assignee",
    "selectteams",
  ]
  const [filteredOptions, setFilteredOptions] = useState(filterOptions)
  const priorities = [
    { value: "highest", label: "Highest", color: "ff0000" },
    { value: "high", label: "High", color: "ff0000" },
    { value: "medium", label: "Medium", color: "ffc300" },
    { value: "low", label: "Low", color: "22c55e" },
    { value: "lowest", label: "Lowest", color: "22c55e" },
  ]
  const isInSpecificBoard = pathname.includes(
    `${org.organization}/board/${org.id}`,
  )
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  useEffect(() => {
    function handleResize() {
      setIsSmallViewport(window.innerWidth <= 617)
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (boardData.length !== 0) {
      const firstBoard = boardData[0]
      const boardIdToUse =
        org.id !== undefined ? Number(org.id) : Number(firstBoard.id)
      setboardId(boardIdToUse)
    }
  }, [boardData, org.id])

  useEffect(() => {
    const uniqueLabels = new Set()

    Array.from(
      data
        .flatMap((columnData) =>
          columnData.cards.flatMap((card) =>
            card.label.map((label) => ({
              name: label.name,
              color: label.color,
            })),
          ),
        )
        .filter((label) => {
          const labelKey = `${label.name}-${label.color}`
          if (uniqueLabels.has(labelKey)) {
            return false
          }
          uniqueLabels.add(labelKey)
          return true
        })
        .sort(),
    )

    setLabels(labels)
  }, [])

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) {
      showErrorToast("No file selected.")
      return
    }

    const validExtensions = [".xlsx", ".xls", ".csv"]
    const fileExtension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase()
    if (!validExtensions.includes(fileExtension)) {
      showErrorToast("Invalid file type. Please upload .xlsx, .xls, or .csv.")
      return
    }

    setIsUploading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      if (!rows || rows.length <= 1) {
        showErrorToast("The sheet is empty or has no data rows.")
        return
      }

      const authorName = session?.user?.name || "System"

      if (!boardId) {
        showErrorToast(
          "Board ID is missing. Please ensure you are on a valid board.",
        )
        return
      }

      const result = await processSheetRows(rows, boardId, authorName)

      if (result.success || result.createdCount > 0) {
        setData((prevData) => {
          const updatedData = [...prevData]
          result.createdCards.forEach((newCard) => {
            const categoryIndex = updatedData.findIndex(
              (category) => category.id === newCard.taskId,
            )
            if (categoryIndex !== -1) {
              updatedData[categoryIndex].cards.push(newCard)
            }
          })
          return updatedData
        })

        showSuccessToast(`Successfully created cards.`)
        if (result.errors.length > 0) {
          showErrorToast(`Some cards could not be created`)
        }
      } else {
        showErrorToast("card alredy created with this SrNum.")
      }
    } catch (err) {
      console.error("Upload error:", err)
      showErrorToast("Failed to upload file.")
    } finally {
      setIsUploading(false)
      fileInputRef.current.value = ""
    }
  }
  useEffect(() => {
    function handleResize() {
      setIsSmallViewport(window.innerWidth <= 617)
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleClickOutside = (event) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target)) {
      setIsOpen(false)
    }
  }
  const handleTeamSelection = (teamName) => {
    setFilterState((prevFilters) => ({
      ...prevFilters,
      specificTeam: teamName || "",
    }))
  }
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleTableViewClick = () => {
    setTableView((prevSelected) => !prevSelected)
  }

  const handleCardSearchChange = (event) => {
    const searchQuery = event.target.value.toLowerCase()
    setCardState(searchQuery)
  }
  const handleAssignedUserSearchChange = (event) => {
    const searchQuery = event.target.value.toLowerCase()
    setAssignedUserSearch(searchQuery)
  }

  const [searchResults, setSearchResults] = useState([])

  const onInputChange = (input) => {
    const trimmedTerm = input.trim().toLowerCase()
    const filteredResults = data
      .filter((item) => {
        const filteredCards = item.cards.filter((card) =>
          card.name.toLowerCase().includes(trimmedTerm),
        )
        return filteredCards.length > 0
      })
      .map((item) => ({
        ...item,
        cards: item.cards.filter((card) =>
          card.name.toLowerCase().includes(trimmedTerm),
        ),
      }))

    setSearchResults(filteredResults)
  }

  const handleSearchInputChange = (event) => {
    const newvalue = event?.target?.value || event
    if (newvalue.trim() === "") {
      setSearchResults([])
    } else {
      onInputChange(newvalue)
    }
  }

  const handleInputChange = (event) => {
    setSearchState(event.target.value)
  }
  const handleFilterChange = (event, userName) => {
    const { name, checked } = event.target
    if (name === "slabel") {
      if (checked) {
        const selectedLabels = labels.filter((item) =>
          selectedKeys.has(item.name),
        )
        setFilterState((prevFilters) => ({
          ...prevFilters,
          specificLabel:
            selectedLabels.length > 0 ? selectedLabels[0].name : "",
        }))
      } else {
        setFilterState((prevFilters) => ({
          ...prevFilters,
          specificLabel: "",
        }))
      }
    } else if (name === "isMarkedAsCompleted") {
      setFilterState((prevFilters) => ({
        ...prevFilters,
        isMarkedAsCompleted: checked,
      }))
    } else if (name === "isMarkedAsInCompleted") {
      setFilterState((prevFilters) => ({
        ...prevFilters,
        isMarkedAsInCompleted: checked,
      }))
    } else if (name === "smember") {
      setFilterState((prevFilters) => ({
        ...prevFilters,
        specificMember: checked ? userName : "",
      }))
    } else {
      setFilterState((prevFilters) => ({
        ...prevFilters,
        [name]: checked,
      }))
    }
    if (checked) {
      setCardState(null)
    } else {
      setFilteredOptions(filterOptions)
    }
  }
  const handleCheckboxChange = (event, userName) => {
    setSelectedMember(userName)
  }
  const selectedValuee = React.useMemo(() => {
    const selectedLabels = labels.filter((item) => selectedKeys.has(item.name))
    return selectedLabels.map((label) => ({
      name: label.name,
      color: label.color,
    }))
  }, [selectedKeys, labels])

  function handleLabelChange(labelKey) {
    const keysArray = Array.from(labelKey)
    setFilterState((prevFilters) => ({
      ...prevFilters,
      specificLabel: keysArray[0] !== "" ? keysArray[0] : "",
    }))
  }

  const matchesFound = assignedUserNames.some(
    (user) =>
      user.name.toLowerCase().includes(cardState) ||
      user.name === selectedMember,
  )

  const handleButtonClick = () => {
    setIsOpen(!isOpen)
  }
  const handleClosefilter = () => {
    setIsOpen(false)
  }
  function handleSelectionChange(memberKeys) {
    const keysArray = Array.from(memberKeys)
    setValue(memberKeys)
    setFilterState((prevFilters) => ({
      ...prevFilters,
      priority: keysArray[0] !== "" ? keysArray[0] : "",
    }))
  }

  const handleReport = () => {
    router.push(`/${org.organization}/report`)
  }

  const handleReleasePage = () => {
    router.push(`/${org.organization}/releases`)
  }

  const handleOpenModal = () => {
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
  }

  if (isSlackIntegrationPage) {
    return null
  }

  return (
    <div className="flex flex-col mr-6">
      <div className="flex mt-3 mb-4 dark:bg">
        <div>
          <Dropdown
            aria-label="My Dropdown"
            shouldBlockScroll={false}
            className="dark:bg z-40"
          >
            <DropdownTrigger>
              <Button variant="light" className="text-xl font-meduim">
                Board
                <MdOutlineKeyboardArrowRight size={100} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Action event example" className="z-40">
              <DropdownItem key="Table View" onClick={handleTableViewClick}>
                Table View
              </DropdownItem>
              <DropdownItem key="Report" onClick={handleReport}>
                Report
              </DropdownItem>
              <DropdownItem key="Releases" onClick={handleReleasePage}>
                Releases
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {!isSmallViewport && !isInProjectPages && (
            <div className="flex gap-4">
              <Button
                className="text-[#fefefe] dark:text-black"
                style={{
                  backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
                }}
                onClick={handleButtonClick}
                variant="light"
              >
                <IoFilterOutline size={20} />
                Filter
              </Button>
              <Button
                className="text-[#fefefe] dark:text-black"
                style={{
                  backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
                }}
                onPress={handleOpenModal}
              >
                <IoShareSocial size={25} />
                {!isSmallViewport && "Share"}
              </Button>
            </div>
          )}
          {isSmallViewport && !isInProjectPages && (
            <Button
              className="text-[#fefefe] dark:text-black"
              style={{
                backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
              }}
              onPress={handleOpenModal}
            >
              <IoShareSocial size={25} />
              {!isSmallViewport && "Share"}
            </Button>
          )}
          {isInSpecificBoard && (
            <>
              <Button
                className="text-[#fefefe] dark:text-black"
                style={{
                  backgroundColor: theme === "dark" ? "#A688FA" : "#7828C8",
                }}
                onClick={() => fileInputRef.current?.click()}
                isDisabled={isUploading}
              >
                <MdOutlineFileUpload size={25} />
                {!isSmallViewport &&
                  (isUploading ? "Uploading..." : "Upload File")}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
            </>
          )}
          <Modal
            isOpen={isModalOpen1}
            onOpenChange={handleCloseModal}
            isDismissable
            isKeyboardDismissDisabled={false}
            className="z-50"
          >
            <ModalContent>
              <>
                <ModalHeader className="text-[#7754bd]">
                  Share PTasks
                </ModalHeader>
                <div className="px-4 py-2 ml-2">
                  <p>Share using the buttons below.</p>
                </div>
                <ModalBody className="flex flex-row items-center gap-4">
                  <WhatsappShareButton
                    url="https://ptasks.positsource.com/auth/login"
                    title="next-share is a social share buttons for your next React apps."
                    separator=":: "
                  >
                    <WhatsappIcon size={32} round />
                  </WhatsappShareButton>
                  <LinkedinShareButton url="https://ptasks.positsource.com/auth/login">
                    <LinkedinIcon size={32} round />
                  </LinkedinShareButton>
                  <EmailShareButton
                    url="https://ptasks.positsource.com/auth/login"
                    subject="Next Share"
                    body="body"
                  >
                    <EmailIcon size={32} round />
                  </EmailShareButton>
                  <FacebookShareButton
                    url="https://ptasks.positsource.com/auth/login"
                    quote="next-share is a social share buttons for your next React apps."
                    hashtag="#nextshare"
                  >
                    <FacebookIcon size={32} round />
                  </FacebookShareButton>
                  <TelegramShareButton
                    url="https://ptasks.positsource.com/auth/login"
                    title="next-share is a social share buttons for your next React apps."
                  >
                    <TelegramIcon size={32} round />
                  </TelegramShareButton>
                  <TwitterShareButton
                    url="https://ptasks.positsource.com/auth/login"
                    title="next-share is a social share buttons for your next React apps."
                  >
                    <TwitterIcon size={32} round />
                  </TwitterShareButton>
                </ModalBody>
                <ModalFooter />
              </>
            </ModalContent>
          </Modal>
        </div>
      </div>

      <div className="flex">
        <div className="serachbar w-1/2 flex h-9 flex-col gap-2 max-w-[450px]">
          {homeserachBar ? (
            <Autocomplete
              placeholder="Type Search here..."
              className="h-12 ml-4 rounded-xl dark:bg-background dark:text z-40"
              onInputChange={handleSearchInputChange}
              showScrollIndicators={false}
              onSelectionChange={(selectedKey) => {
                if (selectedKey !== null) {
                  router.push(
                    `/${org.organization}/board/${boardId}/${selectedKey}`,
                  )
                }
              }}
              startContent={
                <IoIosSearch
                  size={20}
                  className="flex-shrink-0 pointer-events-none text-black/50 dark:text-white/90 text-slate-400"
                />
              }
            >
              {searchResults.length > 0 ? (
                searchResults.map((item) =>
                  item.cards.map((card) => (
                    <AutocompleteItem key={card.id}>
                      {card.name}
                    </AutocompleteItem>
                  )),
                )
              ) : (
                <AutocompleteItem>No results found</AutocompleteItem>
              )}
            </Autocomplete>
          ) : (
            <Input
              placeholder="Type Search here..."
              className="h-12 ml-4 rounded-xl dark:bg-background dark:text z-40"
              value={cardState}
              onChange={handleInputChange}
              startContent={
                <IoIosSearch
                  size={20}
                  className="flex-shrink-0 pointer-events-none text-black/50 dark:text-white/90 text-slate-400"
                />
              }
            />
          )}
        </div>
        <div className="align-content: center; ml-auto">
          {isOpen && (
            <div
              ref={popoverRef}
              className="absolute z-10 inline-block w-full max-w-md text-gray-500 transition-opacity duration-300 bg-white border border-gray-200 rounded-lg shadow-md opacity-100 dark:text-gray-400 dark:border-gray-600 dark:bg"
              style={{ marginLeft: "-450px", overflowY: "auto" }}
            >
              <div className="flex px-3 py-2 mt-4 rounded-t-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Filter
                </h3>
                <section className="flex-grow flex justify-end mt-[-12px]">
                  <Button
                    isIconOnly
                    variant="light"
                    onClick={handleClosefilter}
                  >
                    <IoCloseOutline size={23} />
                  </Button>
                </section>
              </div>
              <div className="popover-scroll-container max-h-[62vh] lg:max-h-[62vh] md:max-h-[50vh] sm:max-h-[47vh] xs:max-h-[38vh] overflow-y-auto no-scrollbar">
                <div className="px-3 py-1">
                  <div>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-col w-full gap-1">
                        <span>Keywords</span>
                        <Input
                          placeholder="Search by card name or label..."
                          className="h-12 rounded-xl dark:bg-background dark:text"
                          value={cardState}
                          onChange={handleCardSearchChange}
                          startContent={
                            <IoIosSearch
                              size={20}
                              className="flex-shrink-0 pointer-events-none text-black/50 dark:text-white/90 text-slate-400"
                            />
                          }
                        />
                        <span>Assignee</span>
                        <Input
                          placeholder="Search by assigned user..."
                          className="h-12 rounded-xl dark:bg-background dark:text"
                          value={assignedUserSearch}
                          onChange={handleAssignedUserSearchChange}
                          startContent={
                            <IoIosSearch
                              size={20}
                              className="flex-shrink-0 pointer-events-none text-black/50 dark:text-white/90 text-slate-400"
                            />
                          }
                        />
                      </div>
                    </div>
                  </div>
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "selectteams") {
                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            marginBottom: "10px",
                          }}
                        >
                          <span>Teams</span>
                          <Dropdown
                            aria-label="Team Dropdown"
                            style={{ alignItems: "center" }}
                            className="z-50"
                          >
                            <DropdownTrigger>
                              <Button
                                variant="flat"
                                className="w-full"
                                style={{
                                  justifyContent: "flex-start",
                                  backgroundColor:
                                    selectedValuee.length > 0
                                      ? selectedValuee[0].color
                                      : "",
                                }}
                              >
                                {filterState.specificTeam
                                  ? filterState.specificTeam
                                  : "Select a Team"}
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                              className="w-96 max-h-[173px] overflow-y-auto no-scrollbar z-50"
                              aria-label="Team selection"
                              closeOnSelect={false}
                              selectionMode="single"
                              selectedKeys={new Set([filterState.specificTeam])}
                              onSelectionChange={(selectedTeam) => {
                                const teamName = Array.from(selectedTeam)[0]
                                handleTeamSelection(teamName)
                              }}
                            >
                              {teams.map((team) => (
                                <DropdownItem
                                  className="w-full"
                                  key={team.name}
                                  value={team.name}
                                  style={{
                                    backgroundColor: team.color,
                                    outline: "none",
                                  }}
                                >
                                  {team.name}
                                </DropdownItem>
                              ))}
                            </DropdownMenu>
                          </Dropdown>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "priority") {
                      return (
                        <div key={index} style={{ marginBottom: "10px" }}>
                          <span>Priority</span>
                          <Select
                            aria-label="My Select"
                            placeholder="Select an priority"
                            className="max-w z-50"
                            size="md"
                            selectedKeys={value}
                            onSelectionChange={(newSelection) =>
                              handleSelectionChange(newSelection)
                            }
                          >
                            {priorities.map((priority) => (
                              <SelectItem
                                startContent={getPriorityIcon(priority.value)}
                                key={priority.value}
                                value={priority.value}
                              >
                                {priority.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      )
                    }
                    return null
                  })}
                  {cardState || selectedMember ? (
                    <div className="flex flex-col gap-1">
                      {matchesFound && <span className="mb-2">Members</span>}
                      {assignedUserNames.length === 0 ? (
                        <div />
                      ) : (
                        assignedUserNames.map(
                          (user) =>
                            (user.name.toLowerCase().includes(cardState) ||
                              user.name === selectedMember) && (
                              <Checkbox
                                color="secondary"
                                key={user.name}
                                checked={
                                  filterState.specificMember === user.name
                                }
                                isSelected={
                                  filterState.specificMember === user.name
                                }
                                onChange={(event) =>
                                  handleCheckboxChange(event, user.name)
                                }
                                name="smember"
                                style={{ marginBottom: "4px" }}
                              >
                                {user.name}
                              </Checkbox>
                            ),
                        )
                      )}
                    </div>
                  ) : null}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "overdue") {
                      return (
                        <div key={index} className="mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="mb-2 ">DueDate</span>
                            <Checkbox
                              color="secondary"
                              checked={filterState.overdue}
                              onChange={handleFilterChange}
                              isSelected={filterState.overdue}
                              name="overdue"
                            >
                              <div className="flex items-center">
                                <GoClock
                                  size={20}
                                  color="white"
                                  style={{
                                    backgroundColor: "#9e2714",
                                    borderRadius: "50%",
                                  }}
                                />
                                <span className="ml-2">Overdue</span>
                              </div>
                            </Checkbox>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "due to next day") {
                      return (
                        <div key={index} className="mb-4">
                          <Checkbox
                            color="secondary"
                            checked={filterState.dueNextDay}
                            onChange={handleFilterChange}
                            isSelected={filterState.dueNextDay}
                            name="dueNextDay"
                          >
                            <div className="flex items-center">
                              <GoClock
                                size={20}
                                color="white"
                                style={{
                                  backgroundColor: "#f0d87a",
                                  borderRadius: "50%",
                                }}
                              />
                              <span className="ml-2">Due to Next Day</span>
                            </div>
                          </Checkbox>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "due to next week") {
                      return (
                        <div key={index} className="mb-4">
                          <Checkbox
                            color="secondary"
                            checked={filterState.dueNextWeek}
                            onChange={handleFilterChange}
                            isSelected={filterState.dueNextWeek}
                            name="dueNextWeek"
                          >
                            <div className="flex items-center">
                              <GoClock
                                size={20}
                                color="black"
                                style={{
                                  backgroundColor: "#e8e8e8",
                                  borderRadius: "50%",
                                }}
                              />
                              <span className="ml-2">Due to Next Week</span>
                            </div>
                          </Checkbox>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "due to next month") {
                      return (
                        <div key={index} className="mb-4">
                          <Checkbox
                            color="secondary"
                            checked={filterState.dueNextMonth}
                            isSelected={filterState.dueNextMonth}
                            onChange={handleFilterChange}
                            name="dueNextMonth"
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <GoClock
                                size={20}
                                color="black"
                                style={{
                                  backgroundColor: "#e8e8e8",
                                  borderRadius: "50%",
                                }}
                              />
                              <span style={{ marginLeft: "8px" }}>
                                Due to Next Month
                              </span>
                            </div>
                          </Checkbox>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "marked as completed") {
                      return (
                        <div key={index} className="mb-4">
                          <Checkbox
                            color="secondary"
                            checked={filterState.isMarkedAsCompleted}
                            isSelected={filterState.isMarkedAsCompleted}
                            onChange={handleFilterChange}
                            name="isMarkedAsCompleted"
                          >
                            <div className="flex items-center">
                              <IoCheckmarkDoneCircleOutline size={23} />
                              <span className="ml-2"> Marked as Completed</span>
                            </div>
                          </Checkbox>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "marked as incompleted") {
                      return (
                        <div key={index} className="mb-4">
                          <Checkbox
                            color="secondary"
                            checked={filterState.isMarkedAsInCompleted}
                            isSelected={filterState.isMarkedAsInCompleted}
                            onChange={handleFilterChange}
                            name="isMarkedAsInCompleted"
                          >
                            <div className="flex items-center">
                              <MdIncompleteCircle size={20} color="#e8e8e8" />
                              <span className="ml-2">
                                {" "}
                                Marked as Incompleted
                              </span>
                            </div>
                          </Checkbox>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "labels") {
                      return (
                        <div key={index} className="mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="mb-2 ">Labels</span>
                            <Checkbox
                              color="secondary"
                              checked={filterState.label}
                              isSelected={filterState.label}
                              onChange={handleFilterChange}
                              name="label"
                            >
                              {" "}
                              <div className="flex items-center ">
                                <MdLabelOutline size={20} />
                                <span className="ml-2">Label</span>
                              </div>
                            </Checkbox>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })}
                  {filteredOptions.map((option, index) => {
                    if (option.toLowerCase() === "selectlabels") {
                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Dropdown aria-label="My Dropdown" className="z-50">
                            <DropdownTrigger>
                              <Button
                                variant="flat"
                                className="w-full"
                                style={{
                                  justifyContent: "flex-start",
                                  backgroundColor:
                                    selectedValuee.length > 0
                                      ? selectedValuee[0].color
                                      : "",
                                }}
                              >
                                {selectedValuee.length > 0
                                  ? selectedValuee[0].name
                                  : "Select a Label"}
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                              className="w-96 max-h-[173px] overflow-y-auto no-scrollbar z-50"
                              aria-label="Multiple selection example"
                              closeOnSelect={false}
                              selectionMode="single"
                              selectedKeys={selectedKeys}
                              onSelectionChange={(Keys) => {
                                setSelectedKeys(Keys)
                                handleLabelChange(Keys)
                              }}
                            >
                              {labels.map((item) => (
                                <DropdownItem
                                  className="w-full"
                                  key={item.name}
                                  style={{
                                    backgroundColor: item.color,
                                    outline: "none",
                                  }}
                                  value={item.name}
                                >
                                  {item.name}
                                </DropdownItem>
                              ))}
                            </DropdownMenu>
                          </Dropdown>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from "react"
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Input,
  useDisclosure,
  AvatarGroup,
  Avatar,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Pagination,
  Progress,
} from "@heroui/react"
import { useSession } from "next-auth/react"
import { TbHomeEdit } from "react-icons/tb"
import { MdOutlineDeleteSweep } from "react-icons/md"
import {
  createTeam,
  fetchTeams,
  fetchAllTeamsByOrganization,
  editTeam,
  deleteTeam,
} from "@/server/team"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"

function tabTeam() {
  const [boards, setBoards] = useState([])
  const { boardData } = useGlobalSyncupContext()
  const { data: session } = useSession()
  const [selectedMembers, setSelectedMembers] = useState([])
  const [boardUser, setBoardUser] = useState([])
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedBoard, setSelectedBoard] = useState([])
  const [teamName, setTeamName] = useState("")
  const [teamDescription, setTeamDescription] = useState("")
  const [teams, setTeams] = useState([])
  const [isCreated, setIsCreated] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedTeam, setEditedTeam] = useState({})
  const [selectedTeams, setSelectedTeams] = useState([])

  const [page, setPage] = useState(1)
  const rowsPerPage = 5

  const startIndex = (page - 1) * rowsPerPage
  const endIndex = page * rowsPerPage
  const paginatedteams = teams.slice(startIndex, endIndex)
  const totalPages = Math.ceil(teams.length / rowsPerPage)
  const paginatedteamsSorted = paginatedteams
    .slice()
    .sort((a, b) => a.id - b.id)

  const handlePageChange = (pageNumber) => {
    setPage(pageNumber)
  }
  useEffect(() => {
    async function fetchBoards() {
      try {
        const allBoards = boardData
        setBoards(allBoards)
        if (allBoards.length > 0) {
          const boardid = allBoards[0].id
          setSelectedBoard([boardid.toString()])
          const users = allBoards.find((board) => board.id === boardid)?.users
          setBoardUser(users)
        } else {
          console.error("No boards available")
          setSelectedBoard([])
          setBoardUser([])
        }
      } catch (error) {
        console.error("Error fetching boards:", error)
        showErrorToast("Error fetching boards")
      }
    }
    fetchBoards()
  }, [session])

  useEffect(() => {
    async function fetchTeamsData() {
      try {
        const boardIds = boardData.map((board) => board.id)
        const fetchedTeams = await fetchAllTeamsByOrganization(boardIds)
        const sortedTeams = fetchedTeams.sort((a, b) => a.id - b.id)
        setTeams(sortedTeams)
        setIsCreated(false)
      } catch (error) {
        console.error("Error fetching teams from tab:", error)
        showErrorToast("Error fetching teams from tab")
      }
    }
    fetchTeamsData()
  }, [boardData, isCreated])

  const handleOpenEditModal = (team) => {
    setIsEditModalOpen(true)
    setEditedTeam(team)
    setTeamName(team.name)
    setTeamDescription(team.description)
  }
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditedTeam({})
    setTeamName("")
    setTeamDescription("")
    setSelectedBoard([boards[0].id.toString()])
    setSelectedMembers([])
  }
  const handleEditTeam = async () => {
    try {
      await editTeam(
        editedTeam.id,
        teamName,
        teamDescription,
        Array.from(selectedMembers),
        selectedBoard[0],
      )
      setIsCreated(true)
      handleCloseEditModal()
      showSuccessToast("Team updated successfully")
    } catch (error) {
      showErrorToast("Error updating team")
    }
  }

  const handleDeleteTeam = async (teamId) => {
    try {
      await deleteTeam(teamId)
      setIsCreated(true)
      showSuccessToast("Team deleted successfully")
    } catch (error) {
      showErrorToast("Error deleting team")
    }
  }
  const handleBoardSelect = async (selectedboard) => {
    const selectedKeys = Array.from(selectedboard)
    if (selectedKeys.length === 0) {
      console.error("No board selected")
      return
    }
    setSelectedBoard(selectedKeys)
    setSelectedMembers([])
    const users = boardData.find(
      (board) => board.id === parseInt(selectedKeys[0], 10),
    )?.users
    setBoardUser(users)
    try {
      const fetchedTeams = await fetchTeams(selectedKeys[0])
      setTeams(fetchedTeams)
    } catch (error) {
      console.error("Error fetching teams for the selected board:", error)
      showErrorToast("Error fetching teams for the selected board")
    }
  }
  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      showErrorToast("Team name is required")
      return
    }

    if (/^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(teamName.trim())) {
      showErrorToast(
        "Team name should not start with a number or special character",
      )
      return
    }

    if (!teamDescription.trim()) {
      showErrorToast("Team description is required")
      return
    }

    if (
      /^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(teamDescription.trim())
    ) {
      showErrorToast(
        "Team description should not start with a number or special character",
      )
      return
    }

    if (selectedMembers.length === 0) {
      showErrorToast("Please select at least one member")
      return
    }

    try {
      await createTeam(
        teamName,
        teamDescription,
        Array.from(selectedMembers),
        selectedBoard[0],
      )
      setIsCreated(true)
      onClose()
      setTeamName("")
      setTeamDescription("")
      setSelectedBoard([boards[0].id.toString()])
      const users = boardData.find(
        (board) => board.id === boardData[0].id,
      )?.users
      setBoardUser(users)
      setSelectedMembers([])
      const fetchedTeams = await fetchTeams(selectedBoard[0])
      setTeams(fetchedTeams)
      showSuccessToast("Team created successfully")
    } catch (error) {
      showErrorToast("Error creating team")
    }
  }
  const handleDeleteMultipleTeams = async () => {
    try {
      if (selectedTeams.length === 0) {
        showErrorToast("Please select at least one team to delete")
        return
      }
      let teamIdsToDelete = []
      if (selectedTeams === "all") {
        teamIdsToDelete = teams.map((team) => team.id)
      } else {
        teamIdsToDelete = Array.from(selectedTeams)
      }
      await Promise.all(
        teamIdsToDelete.map((teamId) => deleteTeam(parseInt(teamId, 10))),
      )
      setSelectedTeams([])
      setIsCreated(true)
      showSuccessToast("Teams deleted successfully")
    } catch (error) {
      showErrorToast("Error deleting teams")
    }
  }

  const handleCloseModal = async () => {
    setTeamName("")
    setTeamDescription("")
    if (boards && boards.length > 0) {
      setSelectedBoard([boards[0].id.toString()])
      const users = boardData.find((board) => board.id === boards[0].id)?.users
      setBoardUser(users || [])
    } else {
      setSelectedBoard([])
      setBoardUser([])
    }
    setSelectedMembers([])

    onClose()
  }
  const calculateTeamProgress = (team) => {
    const totalTasks = team.cards.length
    const completedTasks = team.cards.filter((card) => card.isCompleted).length
    return totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100
  }
  return (
    <div style={{ maxHeight: "75vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "10px",
          marginRight: "20px",
        }}
      >
        {(selectedTeams.size > 0 || selectedTeams === "all") && (
          <Button
            className="mr-2"
            color="danger"
            variant="bordered"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteMultipleTeams()
            }}
          >
            {selectedTeams === "all" ? (
              <>Delete Teams</>
            ) : (
              <>Delete {Array.from(selectedTeams).length} Teams</>
            )}
          </Button>
        )}
        <Button color="secondary" variant="bordered" size="sm" onPress={onOpen}>
          Add Teams
        </Button>
      </div>
      <div
        className="overflow-Y no-scrollbar"
        style={{
          margin: "0 20px",
          maxHeight: "50vh",
        }}
      >
        <Table
          aria-label="Teams table"
          selectionMode="multiple"
          color="secondary"
          onSelectionChange={setSelectedTeams}
        >
          <TableHeader>
            <TableColumn>Team Name</TableColumn>
            <TableColumn>Description</TableColumn>
            <TableColumn>Boards</TableColumn>
            <TableColumn>Team Members</TableColumn>
            <TableColumn>Progress</TableColumn>
            <TableColumn>Action</TableColumn>
          </TableHeader>
          <TableBody>
            {paginatedteamsSorted.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  {team.name.length > 15
                    ? `${team.name.substring(0, 20)}...`
                    : team.name}
                </TableCell>
                <TableCell>
                  {team.description
                    ? team.description
                    : "No description available"}
                </TableCell>
                <TableCell>
                  {team.boards.map((board) => (
                    <div key={board.id}>
                      {board.name.length > 15
                        ? `${board.name.substring(0, 15)}...`
                        : board.name}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <AvatarGroup isBordered max={2} size="sm">
                      {team.members.map((member) => (
                        <Tooltip
                          key={member.id}
                          placement="bottom"
                          showArrow
                          content={
                            member.name.length > 15 ? (
                              <>
                                {member.name
                                  .match(/.{1,15}/g)
                                  .map((line, idx) => (
                                    <div key={idx}>{line}</div>
                                  ))}
                              </>
                            ) : (
                              member.name
                            )
                          }
                        >
                          <Avatar
                            key={member.id}
                            name={member.name ? member.name.charAt(0) : ""}
                            size="sm"
                            src={member.photo}
                          />
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Progress
                      aria-label="Team progress"
                      size="md"
                      value={calculateTeamProgress(team)}
                      color="secondary"
                      showValueLabel
                      className="max-w-md"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="relative flex justify-center gap-2 text-center">
                      <span
                        role="button"
                        tabIndex={0}
                        className={`text-2xl text-default-400 `}
                        onClick={() => handleOpenEditModal(team)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleOpenEditModal(team)
                          }
                        }}
                      >
                        <TbHomeEdit />
                      </span>

                      <Popover placement="top">
                        <PopoverTrigger>
                          <span className="text-2xl cursor-pointer text-danger">
                            <MdOutlineDeleteSweep />
                          </span>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px]">
                          <div className="text-small">
                            Are you sure you want to delete team?
                          </div>

                          <div className="ml-28">
                            <Button
                              color="danger"
                              size="sm"
                              className="capitalize"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages >= 1 && (
        <div className="flex justify-end w-full pr-5">
          <Pagination
            page={page}
            isCompact
            className="mt-[1.5px]"
            showControls
            showShadow
            size="sm"
            total={totalPages}
            color="secondary"
            onChange={handlePageChange}
          />
        </div>
      )}
      <Modal
        isOpen={isOpen}
        onOpenChange={onClose}
        onClose={handleCloseModal}
        className="max-h-screen overflow-y-auto no-scrollbar"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-[#7754bd] ">
            Add Teams
          </ModalHeader>
          <ModalBody>
            <Input
              isRequired
              size="sm"
              type="text"
              label="Team Name"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => {
                if (e.target.value.length <= 30) {
                  setTeamName(e.target.value)
                }
              }}
            />
            <Input
              isRequired
              size="sm"
              type="text"
              label="Description"
              placeholder="Enter team description"
              value={teamDescription}
              onChange={(e) => {
                if (e.target.value.length <= 50) {
                  setTeamDescription(e.target.value)
                }
              }}
            />
            <Select
              isRequired
              size="sm"
              label="Select the board"
              value={selectedBoard}
              selectedKeys={selectedBoard}
              onSelectionChange={handleBoardSelect}
            >
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </Select>
            <Select
              isRequired
              size="sm"
              label="Select members"
              selectionMode="multiple"
              selectedKeys={Array.from(selectedMembers)}
              onSelectionChange={setSelectedMembers}
            >
              {boardUser.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button
              color="secondary"
              variant="light"
              onPress={handleCloseModal}
            >
              CLOSE
            </Button>
            <Button color="secondary" onPress={handleSaveTeam}>
              SAVE
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        className="max-h-screen overflow-y-auto no-scrollbar"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-[#7754bd] ">
            Edit Teams
          </ModalHeader>
          <ModalBody>
            <Input
              isRequired
              size="sm"
              type="text"
              label="Team Name"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <Input
              isRequired
              size="sm"
              type="text"
              label="Description"
              placeholder="Enter team description"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
            />
            <Select
              isRequired
              size="sm"
              label="Select the board"
              value={selectedBoard}
              selectedKeys={selectedBoard}
              onSelectionChange={handleBoardSelect}
            >
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </Select>
            <Select
              isRequired
              size="sm"
              label="Select members"
              selectionMode="multiple"
              selectedKeys={Array.from(selectedMembers)}
              onSelectionChange={setSelectedMembers}
            >
              {boardUser.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onPress={handleEditTeam}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

export default tabTeam

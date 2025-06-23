import {
  Modal,
  ModalContent,
  ModalBody,
  Avatar,
  Input,
  Button,
  Chip,
  Tooltip,
} from "@heroui/react"
import { useParams } from "next/navigation"
import { FiCamera, FiTrash2 } from "react-icons/fi"
import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import PropTypes from "prop-types"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"
import {
  UserData,
  updateProfile,
  updateUser,
  removeProfilePhoto,
} from "@/server/user"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"
import { ROLE_COLORS, PRIORITY_COLORS } from "@/src/constants/appConstants"

const getBoardChipColor = (index) => {
  const colors = ["primary", "secondary", "success", "warning", "danger"]
  return colors[index % colors.length]
}

const getPriorityColor = (priority) => {
  return PRIORITY_COLORS[priority?.toLowerCase()] || "bg-gray-400"
}

export default function ProfileModal({ handleCloseModal }) {
  const orgname = useParams()
  const currentOrgName = orgname.organization
  const { setPhotoUpdate } = useGlobalSyncupContext()
  const [, setOriginalData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  })
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    role: "User",
  })
  const { data: session } = useSession()
  const userEmail = session?.user?.email
  const [image, setImage] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [organizations, setOrganizations] = useState([])
  const [profileData, setProfileData] = useState(null)
  const [selectedOrg, setSelectedOrg] = useState("")
  const [selectedBoard, setSelectedBoard] = useState("")
  const [filteredBoards, setFilteredBoards] = useState([])
  const [filteredCards, setFilteredCards] = useState([])
  const [filteredTeams, setFilteredTeams] = useState([])
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedProfileData = await UserData(userEmail)
        if (fetchedProfileData) {
          const [firstName = "", ...rest] = (
            fetchedProfileData.name || ""
          ).split(" ")
          const lastName = rest.join(" ")
          setData({
            firstName,
            lastName,
            phone: fetchedProfileData.phone || "",
            email: fetchedProfileData.email || "",
            role: fetchedProfileData.role || "User",
          })
          setOriginalData({
            firstName,
            lastName,
            phone: fetchedProfileData.phone || "",
          })
          setImage(fetchedProfileData.photo || "")
          const currentOrg = fetchedProfileData.organizations.find(
            (org) => org.name.toLowerCase() === currentOrgName.toLowerCase(),
          )
          setOrganizations(fetchedProfileData.organizations || [])

          if (currentOrg) {
            setSelectedOrg(currentOrg.name)
            const orgBoards = fetchedProfileData.boards.filter(
              (board) => board.organizationId === currentOrg.id,
            )
            setFilteredBoards(orgBoards)

            if (orgBoards[0]) {
              setSelectedBoard(orgBoards[0].name)
              const boardCards = fetchedProfileData.cards.filter(
                (card) =>
                  card.task.boardId === orgBoards[0].id &&
                  card.status === "active" &&
                  card.release === "UNRELEASED",
              )
              setFilteredCards(boardCards)
              const boardTeams = fetchedProfileData.team.filter((team) =>
                team.boards.some((b) => b.id === orgBoards[0].id),
              )
              setFilteredTeams(boardTeams)
            }
          }

          setProfileData(fetchedProfileData)
        }
      } catch (error) {
        showErrorToast("Error fetching user data")
      }
    }
    if (userEmail) fetchData()
  }, [userEmail, currentOrgName])
  const getCardListContent = (cards = []) => {
    return (
      <div className="py-2">
        <div className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Assigned Cards
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {cards.length > 0 ? (
            cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <div
                  className={`w-2 h-2 rounded-full ${getPriorityColor(card.priority)}`}
                />
                <span>{card.name}</span>
                <span className="text-xs text-gray-400">({card.priority})</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No cards assigned</div>
          )}
        </div>
      </div>
    )
  }
  const handleRemovePhoto = async () => {
    try {
      await removeProfilePhoto(userEmail)
      setImage("")
      setPhotoUpdate(true)
      showSuccessToast("Profile photo removed successfully.")
    } catch (error) {
      showErrorToast("Error removing profile photo")
    }
  }

  const handleFieldChange = (field, value) => {
    setData((prevData) => ({
      ...prevData,
      [field]: value,
    }))
  }

  const handlePhoneChange = (value) => {
    const phoneRegex =
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
    setData((prevData) => ({ ...prevData, phone: value }))
    if (value && !phoneRegex.test(value)) {
      setPhoneError("Please enter a valid phone number")
    } else {
      setPhoneError("")
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    const iName = file?.name
    if (!file) return

    try {
      if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "dev") {
        if (image && image.photo) {
          const imgName = image.imageName
          try {
            await fetch(`/api/delete?fileName=${encodeURIComponent(imgName)}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
            })
          } catch (error) {
            showErrorToast("Error deleting image")
          }
        }

        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          showErrorToast("Error uploading image")
          return
        }
        const imagePath = await response.text()
        const trimmedImagePath = imagePath.trim().replace(/^"|"$/g, "")
        await updateProfile({ iName, imagePath: trimmedImagePath, userEmail })
        setImage(trimmedImagePath)
        setPhotoUpdate(true)
        showSuccessToast("Profile image updated successfully.")
      } else if (file.size < 1024 * 1024) {
        const reader = new FileReader()
        reader.readAsDataURL(file)

        reader.onload = async () => {
          await updateProfile({ imagePath: reader.result, userEmail })
          setImage(reader.result)
          setPhotoUpdate(true)
          showSuccessToast("Profile image updated successfully.")
        }
      }
    } catch (error) {
      showErrorToast("Error uploading image and updating profile")
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (!data.firstName || !data.lastName) {
        showErrorToast("First and last name cannot be empty")
        setIsSaving(false)
        return
      }
      if (phoneError) {
        showErrorToast("Invalid phone number format")
        setIsSaving(false)
        return
      }
      await updateUser({
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        userEmail,
      })
      setOriginalData({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      })
      showSuccessToast("Profile updated successfully.")
      handleCloseModal()
    } catch (error) {
      showErrorToast("Error updating profile")
    }
    setIsSaving(false)
  }

  const handleOrgClick = (orgName) => {
    setSelectedOrg(orgName)
    const selectedOrg = profileData.organizations.find(
      (org) => org.name === orgName,
    )
    if (selectedOrg) {
      const orgBoards = profileData.boards.filter(
        (board) => board.organizationId === selectedOrg.id,
      )
      setFilteredBoards(orgBoards)
      if (orgBoards[0]) {
        setSelectedBoard(orgBoards[0].name)
        const boardCards = profileData.cards.filter(
          (card) =>
            card.task.boardId === orgBoards[0].id &&
            card.status === "active" &&
            card.release === "UNRELEASED",
        )
        setFilteredCards(boardCards)
        const boardTeams = profileData.team.filter((team) =>
          team.boards.some((b) => b.id === orgBoards[0].id),
        )
        setFilteredTeams(boardTeams)
      } else {
        setSelectedBoard("")
        setFilteredCards([])
        setFilteredTeams([])
      }
    }
  }

  const handleBoardClick = (boardName) => {
    setSelectedBoard(boardName)
    const selectedBoard = profileData.boards.find(
      (board) => board.name === boardName,
    )
    if (selectedBoard) {
      const boardCards = profileData.cards.filter(
        (card) =>
          card.task.boardId === selectedBoard.id &&
          card.status === "active" &&
          card.release === "UNRELEASED",
      )
      setFilteredCards(boardCards)
      const boardTeams = profileData.team.filter((team) =>
        team.boards.some((b) => b.id === selectedBoard.id),
      )
      setFilteredTeams(boardTeams)
    }
  }

  return (
    <Modal
      isOpen
      onClose={handleCloseModal}
      size="xl"
      motionProps={{
        variants: {
          enter: {
            scale: [0.85, 1],
            opacity: [0, 1],
            transition: {
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            },
          },
          exit: {
            scale: [1, 0.85],
            opacity: [1, 0],
            transition: {
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1],
            },
          },
        },
      }}
      classNames={{
        backdrop: "backdrop-blur-sm",
        base: "max-h-[85vh] overflow-y-auto",
      }}
    >
      <ModalContent className="rounded-2xl shadow-xl p-0">
        <ModalBody className="p-0">
          <div className="flex flex-col items-center pt-6 pb-2 bg-white dark:bg-gray-900 rounded-t-2xl">
            <div className="flex items-center w-full px-8">
              <div className="relative group">
                <Avatar
                  size="lg"
                  src={image}
                  fallback={
                    data.firstName ? data.firstName[0].toUpperCase() : "U"
                  }
                  className="w-20 h-20 border-4 border-white dark:border-gray-800 shadow-lg"
                />
                <label
                  htmlFor="profile-image"
                  className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-800 rounded-full shadow cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Click to replace"
                >
                  <FiCamera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <input
                    type="file"
                    id="profile-image"
                    className="hidden"
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                </label>
                {image && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    title="Remove photo"
                  >
                    <FiTrash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
              <div className="ml-6 flex-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.firstName} {data.lastName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {data.email}
                </div>
                <div className="mt-2">
                  <Chip
                    color={ROLE_COLORS[data.role] || "secondary"}
                    variant="flat"
                    size="sm"
                    className="capitalize"
                  >
                    {data.role}
                  </Chip>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-4 bg-white dark:bg-gray-900 rounded-b-2xl">
            <div className="mb-4">
              {/* eslint-disable jsx-a11y/label-has-associated-control */}
              <label className="block text-xs font-semibold text-gray-500 mb-2">
                Organizations
              </label>
              <div className="flex flex-wrap gap-2">
                {organizations.map((org, idx) => (
                  <Chip
                    key={idx}
                    color="secondary"
                    variant="flat"
                    size="md"
                    className={`bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 cursor-pointer transition-all
        ${
          selectedOrg === org.name
            ? "ring-2 ring-purple-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 bg-purple-100 dark:bg-purple-900/40 shadow-md"
            : "hover:bg-purple-100 dark:hover:bg-purple-900/30"
        }`}
                    onClick={() => handleOrgClick(org.name)}
                  >
                    {org.name}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-4 mb-2">
              <label className="block text-xs font-semibold text-gray-500 mb-2">
                Boards
              </label>
              <div className="flex flex-wrap gap-3 max-h-24 overflow-y-auto py-1 px-0.5">
                {filteredBoards.map((board, idx) => (
                  <Tooltip
                    key={idx}
                    content={board.name}
                    delay={200}
                    placement="top"
                  >
                    <Chip
                      color={getBoardChipColor(idx)}
                      variant="flat"
                      size="md"
                      className={`rounded-full cursor-pointer transition-all ml-1
            ${
              selectedBoard === board.name
                ? "ring-2 ring-[#7828c8] ring-offset-2 ring-offset-white dark:ring-offset-gray-900 shadow-md scale-102"
                : "hover:scale-101 hover:shadow-sm"
            }
          `}
                      onClick={() => handleBoardClick(board.name)}
                    >
                      {board.name.length > 18
                        ? `${board.name.substring(0, 18)}...`
                        : board.name}
                    </Chip>
                  </Tooltip>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Tooltip
                  content={getCardListContent(filteredCards)}
                  placement="top"
                  delay={200}
                  className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-2 border border-gray-100 dark:border-gray-700"
                  offset={15}
                >
                  <div className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <div className="w-12 h-12 flex items-center justify-center bg-purple-100 dark:bg-purple-900/20 rounded-full">
                        <svg
                          className="w-5 h-5 text-purple-600 dark:text-purple-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <div className="absolute -top-1 -right-1">
                        <Chip
                          size="sm"
                          className="h-6 min-w-6 px-2 bg-purple-600 text-white border-2 border-white dark:border-gray-800"
                        >
                          {filteredCards.length}
                        </Chip>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Assigned Cards
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Active tasks
                      </p>
                    </div>
                  </div>
                </Tooltip>
              </div>
              <div className="flex-1 ml-14">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Teams
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {filteredTeams.map((team, idx) => (
                        <Chip
                          key={idx}
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        >
                          {team.name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label
                    htmlFor="first-name"
                    className="block text-xs font-semibold text-gray-500 mb-1"
                  >
                    First Name
                  </label>
                  <Input
                    id="first-name"
                    value={data.firstName}
                    onChange={(e) =>
                      handleFieldChange("firstName", e.target.value)
                    }
                    placeholder="First Name"
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={data.lastName}
                    onChange={(e) =>
                      handleFieldChange("lastName", e.target.value)
                    }
                    placeholder="Last Name"
                    className="w-full"
                  />
                </div>
              </div>
              <hr className="my-3 border-gray-200 dark:border-gray-700" />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Email Address
                </label>
                <Input
                  value={data.email}
                  disabled
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500"
                  startContent={
                    <span className="pl-1">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 16.5v-9m19.5 0A2.25 2.25 0 0019.5 5.25h-15A2.25 2.25 0 002.25 7.5m19.5 0v.243a2.25 2.25 0 01-.75 1.682l-7.5 6.75a2.25 2.25 0 01-3 0l-7.5-6.75A2.25 2.25 0 012.25 7.743V7.5"
                        />
                      </svg>
                    </span>
                  }
                />
              </div>
              <hr className="my-3 border-gray-200 dark:border-gray-700" />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Phone Number
                </label>
                <Input
                  value={data.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Phone Number"
                  errorMessage={phoneError}
                  isInvalid={!!phoneError}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                color="primary"
                className="bg-[#e4d4f4] text-[#7828c8] hover:bg-[#7828c8] hover:text-white font-semibold"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaving || !!phoneError}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

ProfileModal.propTypes = {
  handleCloseModal: PropTypes.func.isRequired,
}

import React, { useState, useEffect } from "react"
import PropTypes from "prop-types"
import {
  Modal,
  ModalContent,
  ModalBody,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Spacer,
} from "@heroui/react"
import { MdCancel, MdFilterList, MdCheck } from "react-icons/md"
import { useParams } from "next/navigation"
import { useTheme } from "next-themes"
import { useSession } from "next-auth/react"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"
import {
  addCardDependency,
  removeCardDependency,
  getCardDependencies,
  getAllCardsOnBoard,
} from "@/server/task"
import {
  mapEventToMessage,
  NotificationEventConstants,
} from "@/src/components/notification/eventMapper"

export default function DependencyModal({
  isOpen,
  onClose,
  updateId,
  onActivityLog,
}) {
  const params = useParams()
  const boardId = params.id
  const [blockers, setBlockers] = useState([])
  const [blockedBy, setBlockedBy] = useState([])
  const [blockerSearchTerm, setBlockerSearchTerm] = useState("")
  const [filteredBlockerCards, setFilteredBlockerCards] = useState([])
  const [filterStatus, setFilterStatus] = useState("")
  const [, setAllCards] = useState([])
  const { resolvedTheme } = useTheme()
  const { data: session } = useSession()

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const dependencies = await getCardDependencies(updateId)
        setBlockers(dependencies.blockers)
        setBlockedBy(dependencies.blockedBy)
      } catch (error) {
        showErrorToast("Failed to fetch dependencies")
        console.error("Error fetching dependencies:", error)
      }
    }
    fetchDependencies()
    return undefined
  }, [updateId])

  useEffect(() => {
    const fetchAllCards = async () => {
      try {
        const cards = await getAllCardsOnBoard(boardId)
        const activeCards = cards.filter((card) => card.status !== "archived")
        setAllCards(activeCards)

        let filteredCards = activeCards.filter(
          (card) =>
            card?.name
              .toLowerCase()
              .includes(blockerSearchTerm.toLowerCase()) ||
            card?.id.toString().includes(blockerSearchTerm),
        )
        if (filterStatus === "blocked") {
          filteredCards = cards.filter((card) => card.isBlockedBy)
        } else if (filterStatus === "blocker") {
          filteredCards = cards.filter((card) => card.isBlocker)
        } else if (filterStatus === "independent") {
          filteredCards = cards.filter((card) => card.isIndependent)
        }

        setFilteredBlockerCards(filteredCards)
      } catch (error) {
        showErrorToast("Failed to fetch cards")
        console.error("Error fetching cards:", error)
      }
    }
    if (blockerSearchTerm || filterStatus) {
      fetchAllCards()
    } else {
      setFilteredBlockerCards([])
    }
  }, [blockerSearchTerm, filterStatus, boardId])

  const handleAddDependency = async (blockerId, blockedId) => {
    if (blockerId === blockedId) {
      showErrorToast("A card cannot block itself.")
      return
    }
    if (blockers.some((blocker) => blocker.id === blockerId)) {
      showErrorToast("Dependency already exists.")
      return
    }
    if (blockedBy.some((blocked) => blocked.id === blockerId)) {
      showErrorToast("This card is already blocked by the selected card.")
      return
    }
    const result = await addCardDependency({
      blockerId,
      blockedId,
      authorName: session?.user?.name,
    })
    if (result?.error) {
      showErrorToast(result.error)
      return
    }
    try {
      const dependencies = await getCardDependencies(updateId)
      setBlockers(dependencies.blockers)
      setBlockedBy(dependencies.blockedBy)
      setBlockerSearchTerm("")
      setFilteredBlockerCards([])
      showSuccessToast("Dependency added successfully.")
      const blockerCard = filteredBlockerCards.find(
        (card) => card.id === blockerId,
      )
      onActivityLog({
        id: Date.now(),
        cardId: blockedId,
        eventType: NotificationEventConstants.DEPENDENCY_ADDED,
        details: mapEventToMessage(
          NotificationEventConstants.DEPENDENCY_ADDED,
          session?.user?.name,
          `Blocked by: ${blockerCard?.name}`,
        ),
        triggeredBy: session?.user?.name,
        createdAt: new Date().toISOString(),
        type: "activity",
      })
    } catch (error) {
      showErrorToast("Failed to add dependency.")
      console.error("Error adding dependency:", error)
    }
  }

  const handleRemoveDependency = async (blockerId, blockedId) => {
    try {
      const blockerCard = blockers.find((blocker) => blocker.id === blockerId)
      const result = await removeCardDependency({
        blockerId,
        blockedId,
        authorName: session?.user?.name,
      })
      if (result?.error) {
        showErrorToast(result.error)
        return
      }
      const dependencies = await getCardDependencies(updateId)
      setBlockers(dependencies.blockers)
      setBlockedBy(dependencies.blockedBy)
      showSuccessToast("Dependency removed successfully.")
      onActivityLog({
        id: Date.now(),
        cardId: blockedId,
        eventType: NotificationEventConstants.DEPENDENCY_REMOVED,
        details: mapEventToMessage(
          NotificationEventConstants.DEPENDENCY_REMOVED,
          session?.user?.name,
          `No longer blocked by: ${blockerCard?.name}`,
        ),
        triggeredBy: session?.user?.name,
        createdAt: new Date().toISOString(),
        type: "activity",
      })
    } catch (error) {
      showErrorToast("Failed to remove dependency.")
      console.error("Error removing dependency:", error)
    }
  }
  const handleFilterChange = (status) => {
    setFilterStatus((prevStatus) => (prevStatus === status ? "" : status))
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" className="p-4">
      <ModalContent>
        <ModalBody>
          <div
            className={`p-4 rounded-lg ${
              resolvedTheme === "dark"
                ? "bg-gray-800 text-white"
                : "bg-white text-black"
            }`}
          >
            <h4 className="text-lg font-semibold mb-2">Blockers</h4>
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-start w-[65%]">
                <Input
                  className="text-black dark:text-white"
                  width="60%"
                  placeholder="Search by name or ID"
                  value={blockerSearchTerm}
                  onChange={(e) => setBlockerSearchTerm(e.target.value)}
                />
                <Spacer y={0.5} />
                <div
                  className={`border rounded-md p-2 max-h-40 overflow-auto w-[100%] ${
                    resolvedTheme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {filteredBlockerCards.map((card) => (
                    <div
                      key={card.id}
                      className={`flex justify-between items-center rounded p-2 mb-1 cursor-pointer ${
                        resolvedTheme === "dark"
                          ? "bg-gray-600 hover:bg-gray-500"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => handleAddDependency(card.id, updateId)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleAddDependency(card.id, updateId)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span>
                        {card.name} (ID: {card.id})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly light>
                    <MdFilterList className="text-xl" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Filter by Dependency Status"
                  onAction={handleFilterChange}
                >
                  <DropdownItem
                    key="blocked"
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span>Blocked Cards</span>
                      {filterStatus === "blocked" && (
                        <MdCheck
                          className={`${
                            resolvedTheme === "dark"
                              ? "text-white"
                              : "text-black"
                          } font-bold`}
                        />
                      )}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="blocker"
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span>Blocker Cards</span>
                      {filterStatus === "blocker" && (
                        <MdCheck
                          className={`${
                            resolvedTheme === "dark"
                              ? "text-white"
                              : "text-black"
                          } font-bold`}
                        />
                      )}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="independent"
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span>Independent Cards</span>
                      {filterStatus === "independent" && (
                        <MdCheck
                          className={`${
                            resolvedTheme === "dark"
                              ? "text-white"
                              : "text-black"
                          } font-bold`}
                        />
                      )}
                    </div>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>

              <div className="flex flex-col gap-2 min-w-[28%]">
                {blockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className={`rounded-lg px-3 py-1 w-full mb-2 flex justify-between items-center ${
                      blocker.isCompleted
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <span>{blocker.name}</span>
                    <MdCancel
                      className="cursor-pointer"
                      onClick={() =>
                        handleRemoveDependency(blocker.id, updateId)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
DependencyModal.propTypes = {
  onActivityLog: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  updateId: PropTypes.string.isRequired,
}

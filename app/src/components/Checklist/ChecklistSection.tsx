import React, { useState, useEffect } from "react"
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Listbox,
  ListboxItem,
  Checkbox,
  Tooltip,
  CircularProgress,
} from "@heroui/react"
import {
  MdOutlineCheckBox,
  MdAdd,
  MdDelete,
  MdEdit,
  MdOutlineAutoAwesome,
  MdCheck,
} from "react-icons/md"
import { SlOptions } from "react-icons/sl"
import { VscTriangleRight, VscLinkExternal } from "react-icons/vsc"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import {
  createChecklistItem,
  toggleChecklistItem,
  getChecklistItems,
  updateChecklistItem,
  deleteChecklistItem,
  deleteAllChecklistItems,
  convertChecklistItemToCard,
} from "@/server/checklist"
import { useGlobalSyncupContext } from "../../context/SyncUpStore"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"
import { createActivity } from "@/src/utils/createActivity"
import GetSyncupData from "@/server/GetSyncupData"
import { NotificationEventConstants } from "@/src/components/notification/eventMapper"

interface ChecklistItem {
  id: number
  title: string
  isComplete: boolean
  dueDate?: Date
  convertedCardId?: number
}

interface ChecklistSectionProps {
  cardId: string
  cardName: string
  onDependencyUpdate: () => void
  onActivityLog: (activity: any) => void
}

export default function ChecklistSection({
  cardId,
  cardName,
  onDependencyUpdate,
  onActivityLog,
}: ChecklistSectionProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemText, setNewItemText] = useState("")
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const { data: session } = useSession()
  const [editableItemText, setEditableItemText] = useState("")
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    itemId: number | null
  }>({ open: false, itemId: null })
  const [deleteAllModal, setDeleteAllModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { data, setData } = useGlobalSyncupContext()
  const params = useParams()
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null)
  const completedCount = items.filter((item) => item.isComplete).length
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const fetchedItems = await getChecklistItems(parseInt(cardId, 10))
        setItems(fetchedItems)
      } catch (error) {
        showErrorToast("Failed to fetch checklist items")
      }
    }
    fetchItems()
  }, [cardId])

  const handleAddItem = async () => {
    if (!newItemText.trim()) return
    try {
      const authorName = session?.user?.name || "Unknown User"
      const newItem = await createChecklistItem({
        cardId: parseInt(cardId, 10),
        title: newItemText,
        dueDate: null,
        assignedUserIds: [],
        authorName,
      })
      setItems([...items, newItem])
      setNewItemText("")
      setIsAddingItem(false)
      const activityMessage = createActivity(
        NotificationEventConstants.CHECKLIST_ITEM_ADDED,
        authorName,
        parseInt(cardId, 10),
        newItemText,
      )
      onActivityLog(activityMessage)
    } catch (error) {
      showErrorToast("Failed to add item")
    }
  }

  const handleToggleItem = async (itemId: number) => {
    try {
      const updatedItem = await toggleChecklistItem(itemId)
      const newItems = items.map((item) =>
        item.id === itemId
          ? { ...item, isComplete: updatedItem.isComplete }
          : item,
      )
      setItems(newItems)
      if (onDependencyUpdate) onDependencyUpdate()
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Failed to update item",
      )
    }
  }
  const generateAIChecklistItem = async () => {
    try {
      setIsGenerating(true)
      const response = await fetch("/api/generateChecklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate checklist items")
      }
      const authorName = session?.user?.name || "Unknown User"
      const createdItems = await Promise.all(
        data.items.map(async (itemTitle: string) => {
          const trimmedTitle = itemTitle.trim()
          if (!trimmedTitle) {
            showErrorToast("Generated checklist item has an empty title.")
            return null
          }
          const newItem = await createChecklistItem({
            cardId: parseInt(cardId, 10),
            title: trimmedTitle,
            dueDate: null,
            assignedUserIds: [],
            authorName,
          })

          if (!newItem?.title) {
            showErrorToast("Checklist item title is missing.")
            return null
          }
          const activityMessage = createActivity(
            NotificationEventConstants.CHECKLIST_GEN_ITEM_ADDED,
            authorName,
            parseInt(cardId, 10),
            newItem.title,
          )
          onActivityLog(activityMessage)
          return newItem
        }),
      )
      const validItems = createdItems.filter((item) => item !== null)
      setItems((prevItems) => [...prevItems, ...validItems])
      showSuccessToast(
        `Generated ${validItems.length} checklist items successfully!`,
      )
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Failed to generate checklist items",
      )
    } finally {
      setIsGenerating(false)
    }
  }
  const handleEditItem = async (itemId: number, newTitle: string) => {
    try {
      await updateChecklistItem(itemId, newTitle)
      const newItems = items.map((item) =>
        item.id === itemId ? { ...item, title: newTitle } : item,
      )
      setItems(newItems)
      setEditingItemId(null)
    } catch (error) {
      showErrorToast("Failed to update checklist item")
    }
  }
  const handleDeleteItem = async () => {
    if (!deleteModal.itemId) return
    try {
      const deletedItem = items.find((item) => item.id === deleteModal.itemId)
      const authorName = session?.user?.name || "Unknown User"
      await deleteChecklistItem(deleteModal.itemId, authorName)
      setItems(items.filter((item) => item.id !== deleteModal.itemId))
      const updatedData = await GetSyncupData(params.id)
      setData(updatedData)

      if (onDependencyUpdate) {
        onDependencyUpdate()
      }
      showSuccessToast("Item deleted successfully")
      const activityMessage = createActivity(
        NotificationEventConstants.CHECKLIST_ITEM_DELETED,
        authorName,
        parseInt(cardId, 10),
        deletedItem?.title || "Checklist Item",
      )
      onActivityLog(activityMessage)
    } catch (error) {
      showErrorToast("Failed to delete item")
    } finally {
      setDeleteModal({ open: false, itemId: null })
    }
  }
  const handleDeleteAllItems = async () => {
    try {
      const authorName = session?.user?.name || "Unknown User"
      await deleteAllChecklistItems(parseInt(cardId, 10), authorName)
      setItems([])
      showSuccessToast("All checklist items deleted successfully")
      const updatedData = await GetSyncupData(params.id)
      setData(updatedData)

      if (onDependencyUpdate) {
        onDependencyUpdate()
      }
      const activityMessage = createActivity(
        NotificationEventConstants.CHECKLIST_DELETE_ALL,
        authorName,
        parseInt(cardId, 10),
        "",
      )
      onActivityLog(activityMessage)
    } catch (error) {
      showErrorToast("Failed to delete all items")
    } finally {
      setDeleteAllModal(false)
    }
  }
  const currentUrl = window.location.href
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/"))
  const handleConvertToCard = async (itemId: number, categoryId: number) => {
    try {
      const convertedItem = items.find((item) => item.id === itemId)
      const authorName = session?.user?.name || "Unknown User"
      const result = await convertChecklistItemToCard({
        itemId,
        categoryId,
        parentCardId: parseInt(cardId, 10),
        parentUrl: currentUrl,
        authorName,
      })
      if (!result) {
        throw new Error("Failed to convert item to card")
      }
      const newItems = items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              convertedCardId: result.newCardId,
              title: result.newCardTitle,
              isComplete: false,
            }
          : item,
      )
      setItems(newItems)
      const activityMessage = createActivity(
        NotificationEventConstants.CHECKLIST_ITEM_CONVERTED_TO_CARD,
        authorName,
        parseInt(cardId, 10),
        convertedItem?.title?.toString() || "Checklist Item",
      )
      onActivityLog(activityMessage)
      const updatedData = await GetSyncupData(params.id)
      setData(updatedData)
      if (onDependencyUpdate) {
        onDependencyUpdate()
      }

      showSuccessToast("Item converted to card successfully")
      setOpenPopoverId(null)
    } catch (error) {
      showErrorToast("Failed to convert item to card")
    }
  }

  const handleMarkAllComplete = async () => {
    try {
      const allComplete = items.every((item) => item.isComplete)
      const updatePromises = items
        .filter((item) => item.isComplete === allComplete)
        .map((item) => toggleChecklistItem(item.id))

      await Promise.all(updatePromises)
      const updatedItems = items.map((item) => ({
        ...item,
        isComplete: !allComplete,
      }))
      setItems(updatedItems)

      if (onDependencyUpdate) {
        onDependencyUpdate()
      }
      showSuccessToast(
        allComplete
          ? "All checklist items marked as incomplete"
          : "All checklist items marked as complete",
      )
    } catch (error) {
      showErrorToast("Failed to update items")
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-semibold text-black text-md">
          {items.length > 0 ? (
            <button
              type="button"
              className="relative w-6 h-6 p-0 bg-transparent border-none appearance-none cursor-pointer"
              onClick={handleMarkAllComplete}
            >
              {progress === 100 ? (
                <div className="flex items-center justify-center w-4 h-4 mt-1 ml-1 rounded-full bg-success">
                  <MdCheck className="text-sm text-black" />
                </div>
              ) : (
                <CircularProgress
                  value={progress}
                  color="success"
                  strokeWidth={5}
                  size="lg"
                  classNames={{
                    svg: "w-6 h-6",
                    indicator: "stroke-success",
                    track: "stroke-gray-200 dark:stroke-gray-700",
                  }}
                  showValueLabel={false}
                  aria-label="Progress"
                />
              )}
            </button>
          ) : (
            <MdOutlineCheckBox className="text-md text-emerald-500" />
          )}
          <span className="dark:text-white">Checklist</span>
          {items.length > 0 && (
            <span className="text-gray-500">
              ({completedCount}/{items.length})
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-[#e4d4f4] text-[#7828c8] hover:bg-[#7828c8] hover:text-white font-semibold"
            variant="flat"
            color="secondary"
            startContent={<MdAdd className="text-lg font-bold" />}
            onClick={() => setIsAddingItem(true)}
          >
            Add Item
          </Button>
          {items.length > 0 && (
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onClick={() => setDeleteAllModal(true)}
              startContent={<MdDelete />}
            >
              Delete All
            </Button>
          )}
          <Button
            size="sm"
            variant="flat"
            className="bg-[#e4d4f4] text-[#7828c8] hover:bg-[#7828c8] hover:text-white font-semibold"
            color="secondary"
            onClick={generateAIChecklistItem}
            isLoading={isGenerating}
            startContent={!isGenerating && <MdOutlineAutoAwesome />}
          >
            {isGenerating ? "Generating..." : "Generate AI"}
          </Button>
        </div>
      </div>
      {isAddingItem && (
        <div className="flex items-center gap-2 mt-2 ml-4">
          <Input
            className="text-sm dark:bg-gray-700 dark:text-white"
            classNames={{
              input: "h-7 min-h-[28px] py-0",
              inputWrapper: "h-7 min-h-[28px]",
            }}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add an item"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddItem()
            }}
            autoFocus
          />
          <Button
            className="ml-2 font-semibold "
            size="sm"
            variant="flat"
            color="secondary"
            startContent={<MdAdd className="text-3xl font-bold " />}
            onClick={handleAddItem}
          >
            Add
          </Button>
          <Button
            className="font-semibold "
            size="sm"
            variant="light"
            onClick={() => {
              setIsAddingItem(false)
              setNewItemText("")
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-2 py-1 rounded-md group hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center justify-center w-6 h-6">
              {" "}
              <Checkbox
                isSelected={item.isComplete}
                onValueChange={() => handleToggleItem(item.id)}
                color="success"
                radius="full"
                lineThrough
                classNames={{
                  wrapper: "!w-4 !h-4",
                  base: "!w-4 !h-4",
                }}
              />
            </div>
            <div className="flex items-center justify-between w-full">
              {editingItemId === item.id ? (
                <div className="flex-grow">
                  <Input
                    value={editableItemText}
                    onChange={(e) => setEditableItemText(e.target.value)}
                    onBlur={() => handleEditItem(item.id, editableItemText)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleEditItem(item.id, editableItemText)
                    }}
                    autoFocus
                    className="w-full"
                    size="sm"
                  />
                </div>
              ) : !item.convertedCardId ? (
                <Tooltip
                  content={item.title}
                  classNames={{ content: "max-w-[300px] break-words" }}
                >
                  <button
                    type="button"
                    className={`text-left max-w-[380px] overflow-hidden text-ellipsis whitespace-nowrap text-sm ${
                      item.isComplete ? "line-through text-gray-400" : ""
                    }`}
                    onClick={() => {
                      setEditingItemId(item.id)
                      setEditableItemText(item.title)
                    }}
                  >
                    {item.title}
                  </button>
                </Tooltip>
              ) : (
                <Tooltip content={item.title}>
                  <div>
                    <Link
                      href={`${baseUrl}/${item.convertedCardId}`}
                      className={`text-primary-500 hover:underline flex items-center gap-2 max-w-[380px] overflow-hidden text-ellipsis whitespace-nowrap text-sm ${
                        item.isComplete ? "line-through" : ""
                      }`}
                    >
                      {item.title}
                      <VscLinkExternal size={14} />
                    </Link>
                  </div>
                </Tooltip>
              )}
              <div className="flex items-center gap-1 ml-2">
                <Tooltip content="Edit Item">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={() => {
                      setEditingItemId(item.id)
                      setEditableItemText(item.title)
                    }}
                  >
                    <MdEdit className="text-gray-500" />
                  </Button>
                </Tooltip>
                <Popover
                  placement="bottom-end"
                  isOpen={openPopoverId === item.id}
                  onOpenChange={(open) =>
                    setOpenPopoverId(open ? item.id : null)
                  }
                >
                  <PopoverTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <SlOptions />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="gap-2">
                    <Button
                      variant="ghost"
                      className="justify-start w-full py-2 text-black border-none h-fit dark:text-text"
                      color="danger"
                      onClick={() => {
                        setDeleteModal({ open: true, itemId: item.id })
                        setOpenPopoverId(null)
                      }}
                    >
                      Delete Item
                    </Button>
                    {!item.convertedCardId && (
                      <Popover placement="right">
                        <PopoverTrigger>
                          <Button
                            variant="ghost"
                            className="py-2 text-black border-none h-fit dark:text-text"
                            color="secondary"
                            endContent={<VscTriangleRight />}
                          >
                            Convert to Card
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Listbox
                            aria-label="Available Categories"
                            onAction={() => setOpenPopoverId(null)}
                          >
                            {data
                              .filter(
                                (category) =>
                                  !["release", "done"].includes(
                                    category.title.toLowerCase(),
                                  ),
                              )
                              .map((category) => (
                                <ListboxItem
                                  key={category.id}
                                  className="text-black dark:text-text"
                                  color="secondary"
                                  onClick={() =>
                                    handleConvertToCard(item.id, category.id)
                                  }
                                >
                                  {category.title}
                                </ListboxItem>
                              ))}
                          </Listbox>
                        </PopoverContent>
                      </Popover>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, itemId: null })}
      >
        <ModalContent>
          <ModalHeader>Delete Checklist Item</ModalHeader>
          <ModalBody>Are you sure you want to delete this item?</ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setDeleteModal({ open: false, itemId: null })}
            >
              Cancel
            </Button>
            <Button color="danger" onPress={handleDeleteItem}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={deleteAllModal} onClose={() => setDeleteAllModal(false)}>
        <ModalContent>
          <ModalHeader>Delete All Checklist Items</ModalHeader>
          <ModalBody>
            Are you sure you want to delete all checklist items? This will also
            delete any converted cards.
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDeleteAllModal(false)}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleDeleteAllItems}>
              Delete All
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

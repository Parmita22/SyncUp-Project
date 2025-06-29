"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Listbox,
  ListboxItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react"

import { VscTriangleRight } from "react-icons/vsc"
import { SlOptions } from "react-icons/sl"
import PropTypes from "prop-types"
import { showErrorToast } from "@/src/utils/toastUtils"
import { deleteTask } from "@/server/task"
import { useGlobalSyncupContext } from "../context/SyncUpStore"
import GetSyncupData from "../../server/GetSyncupData"

function CardOption({
  taskId,
  currentListId,
  moveCardToList,
  cardTitle,
  boardId,
  boarduser,
  username,
}) {
  const [categories, setCategories] = useState([])
  const [deleteCard, setdeleteCard] = useState(null)
  const { data, setData, setLoad, setcreatenotification } =
    useGlobalSyncupContext()
  const [nestedPopoverOpen, setNestedPopoverOpen] = useState(false)
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  const fetchData = useCallback(async () => {
    try {
      const updatedData = await GetSyncupData(boardId)
      setData(updatedData)
    } catch (error) {
      showErrorToast("Error fetching data")
    } finally {
      setLoad(false)
    }
  }, [boardId, setData, setLoad])

  const handleMoveCard = useCallback(
    (toListId) => {
      try {
        const targetCategory = categories.find((cat) => cat.id === toListId)
        if (targetCategory && targetCategory.title === "Release") {
          const card = categories
            .flatMap((cat) => cat.cards)
            .find((c) => c.id === taskId)
          if (!card) {
            showErrorToast("Card data not found")
            return
          }
          if (!card.isCompleted || card.release !== "RELEASED") {
            showErrorToast(
              "Only completed and released cards can be moved to Release.",
            )
            return
          }
        }
        moveCardToList(taskId, currentListId, toListId)
        fetchData()
      } catch (error) {
        showErrorToast("Error moving card")
      }
    },
    [taskId, currentListId, moveCardToList, fetchData, categories],
  )

  const handleDelete = async () => {
    try {
      await deleteTask(taskId, boarduser, username)
      fetchData()
      setcreatenotification(false)
    } catch (error) {
      showErrorToast("Error deleting card")
    }
    setdeleteCard(null)
  }

  const fetchCategories = async () => {
    try {
      setCategories(data)
    } catch (error) {
      showErrorToast("Error fetching categories")
    }
  }
  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <>
      <Popover placement="bottom-end" style={{ zIndex: 50 }}>
        <PopoverTrigger>
          <div>
            <SlOptions
              onClick={(e) => {
                e.preventDefault()
                setNestedPopoverOpen(true)
                fetchCategories()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setNestedPopoverOpen(true)
                }
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="gap-2">
          <Button
            variant="ghost"
            className="w-full py-2 border-none h-fit text-black dark:text-text justify-start"
            color="danger"
            onPress={onOpen}
            onClick={(e) => {
              e.preventDefault()
              setdeleteCard(e.target)
            }}
          >
            <div>Delete Card</div>
          </Button>
          {nestedPopoverOpen && (
            <Popover placement="right">
              <PopoverTrigger onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  className="py-2 border-none h-fit text-black dark:text-text"
                  color="secondary"
                  endContent={<VscTriangleRight />}
                >
                  Move card To
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Listbox aria-label="Nested Listbox">
                  {categories.map((category) => (
                    <ListboxItem
                      key={category.id}
                      className="text-black dark:text-text"
                      color="secondary"
                      onClick={() => handleMoveCard(category.id)}
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
      {deleteCard && (
        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          style={{ zIndex: 9999 }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  Delete Confirmation
                </ModalHeader>
                <ModalBody>
                  <p>Are you sure you want to delete {cardTitle} card?</p>
                  <p>This Action will delete all checklist cards as well</p>
                  <p>This Action cannot be undone.</p>
                </ModalBody>
                <ModalFooter>
                  <Button color="secondary" variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button color="danger" onPress={handleDelete}>
                    Delete
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </>
  )
}
CardOption.propTypes = {
  taskId: PropTypes.number.isRequired,
  currentListId: PropTypes.number.isRequired,
  moveCardToList: PropTypes.func.isRequired,
  cardTitle: PropTypes.string.isRequired,
  boardId: PropTypes.number.isRequired,
  username: PropTypes.string.isRequired,
  boarduser: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
}

export default CardOption

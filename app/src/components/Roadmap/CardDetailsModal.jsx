"use client"

import React, { useState, useEffect } from "react"
import PropTypes from "prop-types"
import {
  Modal,
  ModalHeader,
  ModalBody,
  Input,
  Textarea,
  ModalContent,
  Slider,
} from "@heroui/react"
import { updateTaskProgress } from "@/server/task"

const formatDueDate = (dueDate) => {
  if (!dueDate) return ""
  const date = new Date(dueDate)
  return Number.isNaN(date.getTime()) ? "" : date.toDateString().slice(0, 15)
}

const formatDescription = (desc) => {
  if (!desc) return ""
  try {
    const parsedDesc = JSON.parse(desc)
    return parsedDesc.blocks.map((block) => block.text).join("\n")
  } catch (error) {
    console.error("Error parsing description:", error)
    return ""
  }
}
function CardDetailsModal({ card, isOpen, onClose }) {
  const [progress, setProgress] = useState(card.progress)
  const [description, setDescription] = useState("")
  useEffect(() => {
    if (card.isCompleted) {
      setProgress(100)
    } else {
      setProgress(card.progress)
    }
    setDescription(formatDescription(card.description))
  }, [card])
  const handleProgressChange = async (value) => {
    setProgress(value)
    try {
      await updateTaskProgress({ taskId: card.id, progress: value })
    } catch (error) {
      console.error("Error updating task progress:", error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      backdrop="blur"
      placement="center"
    >
      <ModalContent>
        <ModalHeader>Card Details</ModalHeader>
        <ModalBody>
          <Input
            label="Due Date"
            value={formatDueDate(card.dueDate)}
            readOnly
          />
          <Textarea label="Description" value={description} readOnly />
          <div>
            <p>Progress: {progress}%</p>
            <Slider
              aria-label="Progress"
              value={progress}
              onChange={handleProgressChange}
              min={0}
              max={100}
              step={1}
              color="secondary"
              disabled={card.isCompleted}
            />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

CardDetailsModal.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    description: PropTypes.string,
    dueDate: PropTypes.string,
    progress: PropTypes.number,
    isCompleted: PropTypes.bool,
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default CardDetailsModal

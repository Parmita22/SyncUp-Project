"use client"

import { TbHomeEdit } from "react-icons/tb"
import { MdOutlineDeleteSweep } from "react-icons/md"
import React, { useState, useEffect, useMemo } from "react"
import {
  Tabs,
  Tab,
  Chip,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Pagination,
} from "@heroui/react"
import { useSession } from "next-auth/react"
import ChatbotSetting from "./ChatbotSetting"
import OrganizationSetting from "./OrganizationSetting"
import { useGlobalSyncupContext } from "../../context/SyncUpStore"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"
import {
  createLabel,
  updateLabel,
  deleteLabel,
  getLabels,
} from "../../../server/label"
import LabelInsertModal from "./LabelInsertModal"
import UserManagement from "./RoleManagement"
import Feedback from "../Feedback/Feedback"
import { hasAccess, Permissions } from "@/src/roleManagement/roleManagement"
import Notification from "./NotificationCustomization"

function LabelManagement() {
  const [selected, setSelected] = React.useState("1")
  const { data: session } = useSession()
  const [openInsertModal, setOpenInsertModal] = useState(false)
  const [editLabel, setEditLabel] = useState(null)
  const { boardData, labels, setLabels, setLabelUpdate, cardState } =
    useGlobalSyncupContext()
  const [first, setfirst] = useState("")
  const [, setload] = useState(true)
  const [boardid, setboardid] = useState("")
  const [delet, setdelete] = useState(false)
  const currentLabels = labels

  const handleCreateLabelClick = () => {
    setOpenInsertModal(true)
    setEditLabel(null)
  }
  const filteredLabels = useMemo(() => {
    if (!cardState) return currentLabels
    return currentLabels.filter((label) =>
      label.name.toLowerCase().includes(cardState.toLowerCase()),
    )
  }, [currentLabels, cardState])
  const [page, setPage] = useState(1)
  const rowsPerPage = 5
  const startIndex = (page - 1) * rowsPerPage
  const endIndex = page * rowsPerPage
  const paginatedLabels = filteredLabels.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredLabels.length / rowsPerPage)
  const paginatedcurrentLabelsSorted = paginatedLabels
    .slice()
    .sort((a, b) => a.id - b.id)

  const handlePageChange = (pageNumber) => {
    setPage(pageNumber)
  }

  useEffect(() => {
    const fetchBoards = async () => {
      if (session && session.user) {
        const sortedBoards = boardData
        if (sortedBoards.length > 0) {
          const firstBoardID = sortedBoards[0].id
          const a = firstBoardID.toString()
          setfirst([a])
        }
      }
    }
    fetchBoards()
  }, [session])

  useEffect(() => {
    if (first !== "") {
      const fetchLabels = async () => {
        const label = await getLabels(
          boardid ? parseInt(boardid, 10) : parseInt(first, 10),
        )
        setload(false)
        setLabels(label)
        setdelete(false)
      }
      fetchLabels()
    }
  }, [boardid, first, openInsertModal, delet])

  const handleInsertLabel = async (labelData) => {
    try {
      if (!labelData.name.trim()) {
        showErrorToast("Label name cannot be empty.")
        return
      }
      const createdLabel = await createLabel(
        labelData.name,
        labelData.color,
        parseInt(labelData.boardId, 10),
      )

      setLabels((prevLabels) => [...prevLabels, createdLabel])

      setOpenInsertModal(false)
      setLabelUpdate(true)
      showSuccessToast("Label created successfully")
    } catch (error) {
      showErrorToast("Error creating label")
    }
  }

  const handleUpdateLabel = async (labelData) => {
    try {
      if (!labelData.name.trim()) {
        showErrorToast("Label name cannot be empty.")
        return
      }

      await updateLabel(
        labelData.id,
        labelData.name,
        labelData.color,
        parseInt(labelData.boardId, 10),
      )
      const updatedLabelIndex = labels.findIndex(
        (label) => label.id === labelData.id,
      )
      if (updatedLabelIndex !== -1) {
        setLabels((prevLabels) => {
          const updatedLabels = [...prevLabels]
          updatedLabels[updatedLabelIndex] = {
            id: labelData.id,
            name: labelData.name,
            color: labelData.color,
          }
          return updatedLabels
        })
      }

      setOpenInsertModal(false)
      setEditLabel(null)
      setLabelUpdate(true)
      showSuccessToast("Label updated successfully")
    } catch (error) {
      showErrorToast("Error updating label")
    }
  }

  const handleDeleteLabel = async (labelId) => {
    try {
      await deleteLabel(labelId)
      setdelete(true)
      setLabelUpdate(true)
      showSuccessToast("Label deleted successfully")
    } catch (error) {
      showErrorToast("Error deleting label")
    }
  }
  const handleSelectionChange = (selecteditems) => {
    const selectedKeys = Array.from(selecteditems)
    if (selectedKeys.length > 0) {
      setboardid(selectedKeys)
      setfirst([selectedKeys.toString()])
    }
  }

  return (
    <div className="flex flex-col mt-3 ml-3 mr-4 w-90vw">
      <Tabs
        color="secondary"
        variant="bordered"
        radius="full"
        fullWidth
        aria-label="Options"
        selectedKey={selected}
        onSelectionChange={setSelected}
      >
        <Tab key="1" disableIndicator title="Label Settings">
          <>
            <div className="flex justify-end">
              <Select
                size="sm"
                className="w-[200px] mb-2 mr-2"
                onSelectionChange={handleSelectionChange}
                selectedKeys={first}
                variant="bordered"
                style={{ borderColor: "#7728c7" }}
                isDisabled={boardData.length === 0}
              >
                {boardData.map((board) => (
                  <SelectItem
                    key={board.id}
                    value={board.value}
                    color="secondary"
                  >
                    {board.name}
                  </SelectItem>
                ))}
              </Select>
              <Button
                className="mb-2 mr-2 "
                size="sm"
                color="secondary"
                variant="bordered"
                onPress={handleCreateLabelClick}
                isDisabled={boardData.length === 0}
              >
                Create label
              </Button>
            </div>
            <div
              className="table-container"
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <Table
                isStriped
                hideHeader
                aria-label="Example static collection table"
              >
                <TableHeader>
                  <TableColumn>Label Name</TableColumn>
                </TableHeader>
                <TableBody>
                  {currentLabels.length === 0 ? (
                    <TableRow>
                      <TableCell>No labels available</TableCell>
                    </TableRow>
                  ) : filteredLabels.length === 0 ? (
                    <TableRow>
                      <TableCell>No labels found</TableCell>
                    </TableRow>
                  ) : (
                    paginatedcurrentLabelsSorted.map((label) => (
                      <TableRow key={label.id} data-label-id={label.id}>
                        <TableCell className="flex justify-between">
                          <Chip
                            style={{
                              backgroundColor: label.color,
                              color: "black",
                            }}
                            aria-label={`Label: ${label.name}`}
                          >
                            {label.name.length > 20
                              ? `${label.name.substring(0, 40)}...`
                              : label.name}
                          </Chip>

                          <div className="flex items-center ">
                            <span
                              className="ml-2 mr-4 cursor-pointer"
                              onClick={() => {
                                setEditLabel(label)
                                setOpenInsertModal(true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  setEditLabel(label)
                                  setOpenInsertModal(true)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <TbHomeEdit
                                sx={{ fontSize: 20, color: "#353535" }}
                                className="text-2xl text-gray-500 cursor-pointer"
                              />
                            </span>
                            <span
                              className="ml-2 cursor-pointer"
                              onClick={() => {
                                handleDeleteLabel(label.id)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleDeleteLabel(label.id)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              aria-label={`Delete label ${label.name}`}
                            >
                              <MdOutlineDeleteSweep
                                sx={{
                                  fontSize: 20,
                                  color: "#353535",
                                }}
                                className="text-2xl text-red-500 cursor-pointer"
                              />
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredLabels.length > 0 && (
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
          </>
        </Tab>
        <Tab disableIndicator key="2" title="Chatbot Setting">
          <ChatbotSetting />
        </Tab>
        <Tab disableIndicator key="3" title="Organization settings">
          <OrganizationSetting />
        </Tab>
        {hasAccess(Permissions.updateRole) && (
          <Tab disableIndicator key="4" title="User Management">
            <div>
              <UserManagement />
            </div>
          </Tab>
        )}
        <Tab disableIndicator key="5" title="Notification Customization">
          <div>
            <Notification />
          </div>
        </Tab>

        {hasAccess(Permissions.viewFeedback) && (
          <Tab disableIndicator key="6" title="Feedback">
            <Feedback />
          </Tab>
        )}
      </Tabs>

      <LabelInsertModal
        open={openInsertModal}
        onClose={() => setOpenInsertModal(false)}
        onInsert={handleInsertLabel}
        onUpdate={handleUpdateLabel}
        initialData={editLabel}
      />
    </div>
  )
}
export default LabelManagement

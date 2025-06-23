import React, { useEffect, useState } from "react"
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Button,
  Checkbox,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react"
import { MdOutlineDeleteSweep } from "react-icons/md"
import { useParams } from "next/navigation"
import { fetchFeedbacks, deleteFeedback } from "@/server/feedback"
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils"

function Feedback() {
  const { organization } = useParams()
  const [feedbacks, setFeedbacks] = useState([])
  const [page, setPage] = useState(1)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const rowsPerPage = 5
  const startIndex = (page - 1) * rowsPerPage
  const endIndex = page * rowsPerPage
  const paginatedFeedbacks = feedbacks.slice(startIndex, endIndex)
  const totalPages = Math.ceil(feedbacks.length / rowsPerPage)
  const allSelected = selectedKeys.size === feedbacks.length

  useEffect(() => {
    const getFeedbacks = async () => {
      try {
        const fetchedFeedbacks = await fetchFeedbacks(organization)
        setFeedbacks(fetchedFeedbacks)
      } catch (error) {
        showErrorToast("Error fetching feedbacks")
      }
    }
    getFeedbacks()
  }, [organization])

  const handlePageChange = (pageNumber) => {
    setPage(pageNumber)
  }

  const handleDeleteFeedback = async (feedbackId) => {
    try {
      await deleteFeedback(feedbackId)
      setFeedbacks(feedbacks.filter((feedback) => feedback.id !== feedbackId))
      showSuccessToast("Feedback deleted successfully")
    } catch (error) {
      showErrorToast("Error deleting feedback")
    }
  }

  const handleDeleteMultiple = async () => {
    try {
      await Promise.all([...selectedKeys].map((id) => deleteFeedback(id)))
      setFeedbacks(
        feedbacks.filter((feedback) => !selectedKeys.has(feedback.id)),
      )
      setSelectedKeys(new Set())
      showSuccessToast("Selected feedbacks deleted successfully")
    } catch (error) {
      showErrorToast("Error deleting feedbacks")
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedKeys(new Set(feedbacks.map((feedback) => feedback.id)))
    } else {
      setSelectedKeys(new Set())
    }
  }

  return (
    <div className="p-4">
      {feedbacks.length === 0 ? (
        <div className="flex justify-center items-center h-[50vh]">
          <p className="text-lg text-gray-500">No feedbacks present</p>
        </div>
      ) : (
        <>
          {selectedKeys.size > 0 && (
            <div className="flex justify-end mb-2">
              <Popover>
                <PopoverTrigger>
                  <Button
                    className=" mr-2"
                    size="sm"
                    color="danger"
                    variant="bordered"
                  >
                    Delete Selected ({selectedKeys.size}) feedback
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px]">
                  <div className="text-small text-center">
                    Are you sure you want to delete selected feedbacks?
                  </div>
                  <div className="flex justify-center mt-2">
                    <Button
                      color="danger"
                      size="sm"
                      onClick={handleDeleteMultiple}
                    >
                      Confirm Delete
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex flex-col max-h-[25rem] overflow-auto gap-5 no-scrollbar">
            <Table className="w-full">
              <TableHeader>
                <TableColumn>
                  <Checkbox
                    isSelected={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableColumn>
                <TableColumn>Username</TableColumn>
                <TableColumn>Feedback</TableColumn>
                <TableColumn>Date</TableColumn>
                <TableColumn className="text-center">Action</TableColumn>
              </TableHeader>
              <TableBody>
                {paginatedFeedbacks.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      <Checkbox
                        isSelected={selectedKeys.has(feedback.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedKeys)
                          if (e.target.checked) {
                            newSelected.add(feedback.id)
                          } else {
                            newSelected.delete(feedback.id)
                          }
                          setSelectedKeys(newSelected)
                        }}
                      />
                    </TableCell>
                    <TableCell>{feedback.username}</TableCell>
                    <TableCell>{feedback.message}</TableCell>
                    <TableCell>
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Popover placement="top">
                        <PopoverTrigger>
                          <Button
                            isIconOnly
                            color="danger"
                            variant="light"
                            size="sm"
                            className="mx-auto"
                          >
                            <MdOutlineDeleteSweep className="text-lg" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] text-center">
                          <div className="text-small mb-2">
                            Are you sure you want to delete this feedback?
                          </div>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => handleDeleteFeedback(feedback.id)}
                          >
                            Confirm Delete
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex w-full justify-end pr-5">
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
        </>
      )}
    </div>
  )
}
export default Feedback

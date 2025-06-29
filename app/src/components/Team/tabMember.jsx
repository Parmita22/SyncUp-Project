import React, { useState, useEffect } from "react"
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Progress,
  Pagination,
} from "@heroui/react"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"
import { fetchUserTasks } from "@/server/task"
import { showErrorToast } from "@/src/utils/toastUtils"

function tabMember() {
  const [users, setUsers] = useState([])
  const { allUserData } = useGlobalSyncupContext()

  const [page, setPage] = useState(1)
  const rowsPerPage = 5

  useEffect(() => {
    async function fetchUsersData() {
      try {
        const usersWithTasks = await Promise.all(
          allUserData.map(async (user) => {
            const tasks = await fetchUserTasks(user.id)
            const completedTasks = tasks.filter((task) => task.isCompleted)
            const progress = tasks.length
              ? (completedTasks.length / tasks.length) * 100
              : 0
            return { ...user, tasks, progress }
          }),
        )
        setUsers(usersWithTasks)
      } catch (error) {
        showErrorToast("Error fetching users")
      }
    }
    fetchUsersData()
  }, [])

  const startIndex = (page - 1) * rowsPerPage
  const endIndex = page * rowsPerPage
  const paginatedusers = users.slice(startIndex, endIndex)
  const totalPages = Math.ceil(users.length / rowsPerPage)
  const paginatedusersSorted = paginatedusers
    .slice()
    .sort((a, b) => a.id - b.id)

  const handlePageChange = (pageNumber) => {
    setPage(pageNumber)
  }

  return (
    <div
      className="max-h-[50vh] overflow no-scrollbar"
      style={{
        margin: "0 20px",
      }}
    >
      <Table aria-label="Members table" color="secondary">
        <TableHeader>
          <TableColumn>Name</TableColumn>
          <TableColumn>Email</TableColumn>
          <TableColumn>Role</TableColumn>
          <TableColumn>Tasks Assigned</TableColumn>
          <TableColumn>Tasks Progress</TableColumn>
        </TableHeader>
        <TableBody>
          {paginatedusersSorted.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                {user.name.length > 15
                  ? `${user.name.substring(0, 25)}...`
                  : user.name}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                {user.tasks.map((task) => task.name).join(", ")}
              </TableCell>
              <TableCell>
                <Progress
                  aria-label="Task progress"
                  size="md"
                  value={user.progress}
                  color="secondary"
                  showValueLabel
                  className="max-w-md"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages >= 1 && (
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
      )}
    </div>
  )
}

export default tabMember

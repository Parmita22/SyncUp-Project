"use client"

import { React, useEffect, useState } from "react"
import { MdContentCopy } from "react-icons/md"
import { Button, Card, CardBody, CardHeader } from "@heroui/react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { showSuccessToast, showErrorToast } from "@/src/utils/toastUtils"
import Loader from "@/src/components/Loader"

export default function TokenAlreadyPresent() {
  const params = useParams()
  const { theme } = useTheme()
  const [repos, setRepos] = useState([])
  const [pullRequests, setPullRequests] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [loadingPRs, setLoadingPRs] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const isDark = theme === "dark"

  useEffect(() => {
    async function fetchRepos() {
      try {
        const userId = localStorage.getItem("userId") || "1"
        const res = await fetch(`/api/git/repos?userId=${userId}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch repositories")
        }

        setRepos(data.boards)
      } catch (err) {
        showErrorToast(err.message)
      } finally {
        setLoadingRepos(false)
      }
    }

    fetchRepos()
  }, [])

  const fetchPullRequests = async (repo) => {
    setLoadingPRs(true)
    setSelectedRepo(repo)
    try {
      const userId = localStorage.getItem("userId") || "1"
      const res = await fetch(
        `/api/git/prs?userId=${userId}&repoId=${repo.name}&owner=${repo.owner || params.organization}`,
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch pull requests")
      }

      setPullRequests(data.pullRequests)
    } catch (err) {
      showErrorToast(err.message)
    } finally {
      setLoadingPRs(false)
    }
  }

  const handleCopy = (link) => {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        showSuccessToast("Link copied to clipboard!")
      })
      .catch(() => {
        showErrorToast("Failed to copy link")
      })
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const userId = localStorage.getItem("userId") || "1"
      const { organization } = params

      const res = await fetch(
        `/api/token-delete?userId=${userId}&organization=${organization}`,
        { method: "DELETE" },
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to disconnect")
      }

      showSuccessToast("Successfully disconnected from GitHub")
      window.location.href = `/${organization}/github`
    } catch (err) {
      showErrorToast(err.message)
    } finally {
      setIsDisconnecting(false)
    }
  }
  const getRepoInitial = (repoName) => {
    return repoName ? repoName.slice(0, 1).toUpperCase() : "--"
  }

  return (
    <Card className="mx-4 mt-3 rounded-lg h-[calc(98vh-100px)] border">
      <CardBody className="p-0">
        <div className="flex overflow-hidden rounded-lg h-[calc(100vh-130px)]">
          <div className="flex flex-col w-64 border-r">
            <CardHeader className="flex items-center justify-between px-4 border-b h-14 ">
              <h3 className="text-lg font-semibold truncate">Repositories</h3>
              <Button
                onClick={handleDisconnect}
                className={`${
                  theme === "dark"
                    ? "text-red-400 hover:text-red-600"
                    : "text-red-500 hover:text-red-700"
                }`}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </CardHeader>
            <CardBody className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[calc(100vh-200px)]">
              {loadingRepos ? (
                <div className="flex items-center justify-center p-4">
                  <Loader />
                </div>
              ) : repos.length === 0 ? (
                <div className="p-4 text-gray-600">No repositories found.</div>
              ) : (
                repos.map((repo) => (
                  <Button
                    key={repo.id}
                    onClick={() => fetchPullRequests(repo)}
                    className="flex items-center justify-start w-full gap-3 px-4 py-2 text-black transition-colors bg-gray-100 rounded-md hover:bg-purple-100 dark:hover:bg-purple-800 dark:bg-gray-700 dark:text-white"
                  >
                    <div className="flex items-center justify-center w-6 h-6 text-sm font-bold text-black uppercase bg-white rounded">
                      {getRepoInitial(repo.name)}
                    </div>
                    <span className="text-sm font-medium truncate">
                      {repo.name}
                    </span>
                  </Button>
                ))
              )}
            </CardBody>
          </div>
          <div className="flex flex-col flex-1 ">
            <CardHeader className="flex items-center justify-between px-4 py-3 border-b h-14 ">
              <h3 className="text-lg font-semibold">
                {selectedRepo
                  ? `Pull Requests for ${selectedRepo.name}`
                  : "Pull Requests"}
              </h3>
            </CardHeader>
            <CardBody className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-310px)]">
              {!selectedRepo ? (
                <div className="p-4 text-gray-600">
                  Select a repository to view pull requests.
                </div>
              ) : loadingPRs ? (
                <div className="p-4 text-gray-600">
                  <Loader />
                </div>
              ) : pullRequests.length === 0 ? (
                <div className="p-4 text-gray-600">
                  No open pull requests for this repository.
                </div>
              ) : (
                pullRequests.map((pr) => (
                  <Card
                    key={pr.id}
                    className="relative p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
                  >
                    <Button
                      onClick={() => handleCopy(pr.htmlUrl)}
                      className="absolute text-gray-500 top-3 right-3 hover:text-gray-800 dark:hover:text-gray-300"
                      title="Copy PR link"
                      variant="ghost"
                      size="icon"
                    >
                      <MdContentCopy size={18} />
                    </Button>
                    <div className="flex items-start gap-3 pr-8">
                      <div className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-white bg-gray-500 rounded-full">
                        {pr.title ? pr.title.charAt(0).toUpperCase() : "P"}
                      </div>
                      <div>
                        <h4
                          className={`font-medium text-sm mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                          {pr.title}
                        </h4>
                        <p
                          className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                        >
                          #{pr.number}{" "}
                          <Link
                            href={pr.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${isDark ? "text-blue-400" : "text-blue-600"} hover:underline`}
                          >
                            View on GitHub
                          </Link>
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardBody>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

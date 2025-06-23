"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardBody, CardHeader, Button } from "@heroui/react"
import { useTheme } from "next-themes"
import { FaGithub } from "react-icons/fa6"
import { showErrorToast } from "@/src/utils/toastUtils"
import Loader from "@/src/components/Loader"

export default function GitIntegration() {
  const [hasToken, setHasToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()
  const params = useParams()
  const { organization } = params
  const { theme } = useTheme()

  const handleCheckToken = async () => {
    const email = session?.user?.email
    if (!email) {
      showErrorToast("No user email available")
      return
    }

    try {
      const response = await fetch(
        `/api/git/token-status?email=${encodeURIComponent(email)}&organization=${organization}`,
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check token status")
      }

      setHasToken(data.hasToken)

      if (data.hasToken) {
        router.push(`/${organization}/github/token-present`)
      }
    } catch (error) {
      showErrorToast(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    const githubOAuthUrl = `/api/git/authorize?organization=${organization}`
    window.location.href = githubOAuthUrl
  }

  useEffect(() => {
    if (status === "authenticated") {
      handleCheckToken()
    }
  }, [status])

  return (
    <div className="mx-4 mt-3 text-gray-900 bg-white border border-gray-200 rounded-lg h-[calc(98vh-100px)]">
      <div className="flex items-center justify-center h-full">
        <Card className="w-full h-full">
          <CardHeader className="py-6 text-center border-b border-gray-300">
            <h1
              className={`text-2xl font-bold flex items-center justify-center gap-2 ${
                theme === "dark" ? "text-white" : "text-gray-800"
              }`}
            >
              <FaGithub className="text-3xl" />
              GitHub Integration
            </h1>
          </CardHeader>

          <CardBody className="flex flex-col items-center justify-center h-full">
            {loading ? (
              <Loader />
            ) : hasToken ? (
              <p className="text-lg text-gray-600">
                You are already authenticated with GitHub.
              </p>
            ) : (
              <>
                <p
                  className={`text-xl font-bold ${
                    theme === "dark" ? "text-white" : "text-gray-800"
                  }`}
                >
                  To integrate with GitHub, click the button below to authorize
                  your account.
                </p>
                <Button
                  onClick={handleConnect}
                  className="px-6 py-3 rounded-md bg-[#e4d4f4] text-[#7828c8] hover:bg-[#7828c8] hover:text-white font-semibold"
                >
                  Connect GitHub
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

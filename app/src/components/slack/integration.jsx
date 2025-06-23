"use client"

import { useSession } from "next-auth/react"
import React, { useState, useEffect } from "react"
import { useSearchParams, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import Loader from "@/src/components/Loader"
import { showErrorToast } from "@/src/utils/priorityUtlis"

const SlackChat = dynamic(() => import("./SlackChat"), {
  ssr: false,
  loading: () => <Loader />,
})

const ErrorBoundary = dynamic(() => import("./ErrorBoundary"), {
  ssr: false,
})

export default function Integrations() {
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [teamName, setTeamName] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState(null)
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const { organization } = useParams()

  const scopes = [
    "channels:read",
    "chat:write",
    "incoming-webhook",
    "commands",
    "im:write",
    "users:read",
    "users:read.email",
  ].join(",")

  const redirectUri = `${process.env.NEXT_PUBLIC_SLACK_REDIRECT_URI}`.replace(
    "[organization]",
    organization,
  )

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${
    process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
  }&scope=${scopes}&redirect_uri=${redirectUri}&team=new`

  const exchangeCodeForToken = async (code) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/slack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })
      if (!response.ok) {
        throw new Error("Failed to exchange code for token")
      }
      const data = await response.json()
      setToken(data.access_token)
      setTeamName(data.team?.name)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkExistingIntegration = async () => {
    if (!session?.user?.email) return
    try {
      const response = await fetch(
        `/api/slack/token?email=${session.user.email}&organization=${organization}`,
      )
      const data = await response.json()

      if (data.connected) {
        setToken(data.accessToken)
        setTeamName(data.teamName)
      } else {
        setToken(null)
        setTeamName(null)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const disconnectSlack = async () => {
    if (!session?.user?.email) return
    try {
      setIsLoading(true)
      const response = await fetch("/api/slack/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session.user.email,
          organization,
        }),
      })

      if (response.ok) {
        setToken(null)
        setTeamName(null)
      } else {
        showErrorToast("Failed to disconnect from Slack")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      const error = searchParams.get("error")
      if (error) {
        setError(new Error(decodeURIComponent(error)))
      }

      checkExistingIntegration()

      const code = searchParams.get("code")
      if (code) {
        exchangeCodeForToken(code)
      }

      const success = searchParams.get("success")
      if (success === "true") {
        checkExistingIntegration()
      }
    }
  }, [searchParams, mounted])

  useEffect(() => {
    if (mounted && session?.user?.email) {
      checkExistingIntegration()
    }
  }, [organization, session?.user?.email, mounted])

  const handleSlackAuth = () => {
    if (!session?.user?.email) return
    if (token) {
      disconnectSlack()
    } else {
      const state = `${organization}:${session.user.email}`
      const slackAuthUrlWithState = `${slackAuthUrl}&state=${encodeURIComponent(state)}`
      window.location.href = slackAuthUrlWithState
    }
  }
  if (!mounted) {
    return null
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="w-full h-full mx-auto overflow-y-auto">
        <ErrorBoundary>
          {!token && (
            <div className="p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Slack Integration
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Connect your Slack workspace to receive real-time updates
                    and alerts.
                  </p>
                  {error && (
                    <div className="mt-2 text-red-600">{error.message}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="px-6 py-2 font-semibold text-white rounded bg-secondary hover:bg-secondary-dark disabled:opacity-50"
                  onClick={handleSlackAuth}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Processing..."
                    : error
                      ? "Retry Authorization"
                      : "Authorize with Slack"}
                </button>
              </div>
            </div>
          )}
          {token && (
            <SlackChat
              token={token}
              teamName={teamName}
              onDisconnect={disconnectSlack}
              isDisconnecting={isLoading}
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}

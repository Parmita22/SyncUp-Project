"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FaExclamationTriangle, FaArrowLeft } from "react-icons/fa"
import { Button, Card, CardBody, CardHeader, Tooltip } from "@heroui/react"

export default function GitHubError() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const organization = searchParams.get("organization")

  const handleGoBack = () => {
    if (organization) {
      router.push(`/${organization}/github`)
    } else {
      router.back()
    }
  }

  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      org_mismatch:
        "You're trying to connect from a different organization than the one you're authorized for.",
      not_member: "You're not a member of this GitHub organization.",
      no_email: "Unable to retrieve your GitHub email address.",
      token_failed: "Failed to retrieve GitHub access token.",
      default: "An error occurred during GitHub integration.",
    }
    return errorMessages[errorCode] || errorMessages.default
  }

  return (
    <Card className="max-w-lg mx-auto mt-10">
      <CardHeader className="flex flex-col items-center text-center">
        <Tooltip content="Error Icon">
          <FaExclamationTriangle className="text-6xl text-yellow-500 mb-4" />
        </Tooltip>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          GitHub Integration Error
        </h1>
      </CardHeader>
      <CardBody>
        <p className="text-gray-600 mb-6">{getErrorMessage(error)}</p>
        <Button
          onClick={handleGoBack}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
          Return to Integration Page
        </Button>
      </CardBody>
    </Card>
  )
}

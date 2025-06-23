"use client"

import React from "react"
import { useSearchParams } from "next/navigation"
import Integration from "@/src/components/git/GitIntegration"
import { showSuccessToast, showErrorToast } from "@/src/utils/toastUtils"

function GitSetting() {
  const searchParams = useSearchParams()
  const success = searchParams.get("success")
  const error = searchParams.get("error")

  if (success === "true") {
    showSuccessToast("GitHub integration was successful!")
  }
  if (error) {
    showErrorToast(`Error: ${decodeURIComponent(error)}`)
  }

  return (
    <div>
      <Integration />
    </div>
  )
}

export default GitSetting

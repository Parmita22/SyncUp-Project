"use client"

import { addToast } from "@heroui/react"

export const showSuccessToast = (description) => {
  addToast({
    title: "Success",
    description,
    color: "success",
  })
}

export const showErrorToast = (description) => {
  addToast({
    title: "Error",
    description,
    color: "danger",
  })
}

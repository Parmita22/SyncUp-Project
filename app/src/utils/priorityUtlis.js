"use client"

import React from "react"
import {
  FaAngleDoubleUp,
  FaAngleUp,
  FaEquals,
  FaAngleDown,
  FaAngleDoubleDown,
} from "react-icons/fa"

export const getPriorityIcon = (priority) => {
  switch (priority) {
    case "highest":
      return <FaAngleDoubleUp color="#ff0000" className="w-4 h-4" />
    case "high":
      return <FaAngleUp color="#ff0000" className="w-4 h-4" />
    case "medium":
      return <FaEquals color="#ffc300" className="w-3 h-3" />
    case "low":
      return <FaAngleDown color="#22c55e" className="w-4 h-4" />
    case "lowest":
      return <FaAngleDoubleDown color="#22c55e" className="w-4 h-4" />
    default:
      return null
  }
}

"use client"

import React, { Component } from "react"
import PropTypes from "prop-types"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      errorMessage: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "An error occurred",
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Slack chat error:", error, errorInfo)
  }

  render() {
    const { hasError, errorMessage } = this.state
    const { children } = this.props

    if (hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <p className="text-red-600">
            {errorMessage || "Something went wrong with the Slack integration"}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-500 hover:text-red-700"
          >
            Try again
          </button>
        </div>
      )
    }

    return children
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
}

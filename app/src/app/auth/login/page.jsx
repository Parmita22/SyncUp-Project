"use client"

import React, { useEffect, useState } from "react"
import { MdRotateLeft } from "react-icons/md"
import { signIn } from "next-auth/react"
import { useTheme } from "next-themes"
import appConfig from "@/app.config"

function LoginForm() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme")
      if (storedTheme) {
        setTheme(storedTheme)
      }
    }
  }, [setTheme])

  if (!mounted) return null

  const loginWithGoogle = async () => {
    await signIn("google", { callbackUrl: "/auth/selectorganization" })
  }

  return (
    <div
      className="flex justify-center items-center"
      style={{
        backgroundColor: resolvedTheme === "dark" ? "#333" : "#eef2f6",
        minHeight: "100vh",
        width: "100vw",
      }}
    >
      <div
        className="md:w-1/4 p-6 space-y-4 md:space-y-6 rounded-md"
        style={{
          backgroundColor: resolvedTheme === "dark" ? "#444" : "#f9fafb",
          color: resolvedTheme === "dark" ? "#fff" : "#000",
        }}
      >
        <div className="text-center mb-8 flex items-center justify-center">
          <MdRotateLeft
            style={{
              color: resolvedTheme === "dark" ? "#fff" : "#673AB7",
              fontSize: "2rem",
            }}
          />
          <h2
            className="text-3xl font-bold ml-1"
            style={{ fontSize: "24px", fontFamily: "Roboto" }}
          >
            {appConfig.PROJECT_NAME}
          </h2>
        </div>
        <div>
          <div
            className="text-center mb-3 font-bold"
            style={{
              fontFamily: "Roboto",
              color: resolvedTheme === "dark" ? "#fff" : "#673AB7",
              fontSize: "24px",
            }}
          >
            Hi, Welcome
          </div>
        </div>
        <div className="flex justify-center items-center sm:px-0 max-w-full pb-5">
          <button
            type="button"
            className="w-full flex items-center justify-center mx-2 border rounded-md p-2 focus:outline-none transition duration-300 ease-in-out hover:shadow-md"
            style={{
              backgroundColor: resolvedTheme === "dark" ? "#555" : "#f9fafb",
              borderColor: resolvedTheme === "dark" ? "#666" : "#d1d5db",
              color: resolvedTheme === "dark" ? "#fff" : "#000",
            }}
            onClick={loginWithGoogle}
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google Logo"
              className="w-6 h-6 mr-2"
            />
            <span className="text-sm font-medium">Log In with Google</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginForm

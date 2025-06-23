"use client"

import React, { useState, useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { format } from "date-fns"
import ReactQuill from "react-quill"
import "react-quill/dist/quill.snow.css"
import { Card, CardBody, Button, Avatar, Divider, Spinner } from "@heroui/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTheme } from "next-themes"
import { MdSend } from "react-icons/md"
import { htmlToText } from "html-to-text"
import { showErrorToast } from "@/src/utils/toastUtils"

export default function SlackChat({
  token,
  teamName,
  onDisconnect,
  isDisconnecting,
}) {
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef(null)
  const { resolvedTheme } = useTheme()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch("/api/slack/channels", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        setChannels(data.channels)
      } catch (error) {
        console.error("Error fetching channels:", error)
      }
    }

    if (token) fetchChannels()
  }, [token])
  const fetchMessages = async () => {
    if (!selectedChannel) return

    setMessageLoading(true)
    try {
      await fetch(`/api/slack/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel: selectedChannel }),
      })

      const response = await fetch(
        `/api/slack/messages?channel=${selectedChannel}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const data = await response.json()
      setMessages(data.messages.reverse())
      scrollToBottom()
    } catch (error) {
      showErrorToast("error")
    } finally {
      setMessageLoading(false)
    }
  }

  useEffect(fetchMessages(), [selectedChannel, token])

  useEffect(() => {
    const handleSlashCommand = async (event) => {
      if (event.data?.command === "/syncup") {
        await fetchMessages()
      }
    }

    window.addEventListener("slack-command", handleSlashCommand)
    return () => window.removeEventListener("slack-command", handleSlashCommand)
  }, [])

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return

    setLoading(true)

    const plainTextMessage = htmlToText(newMessage, {
      wordwrap: false,
      preserveNewlines: false,
    })

    try {
      const response = await fetch("/api/slack/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel: selectedChannel,
          text: plainTextMessage,
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")
      setNewMessage("")
      const messagesResponse = await fetch(
        `/api/slack/messages?channel=${selectedChannel}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const data = await messagesResponse.json()

      if (data.messages) {
        setMessages(data.messages.reverse())
        scrollToBottom()
      }
    } catch (error) {
      setMessages((prev) => prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      className={`mx-4 mt-3 rounded-lg border ${
        resolvedTheme === "dark"
          ? "bg-gray-900 text-gray-100 border-gray-700"
          : "bg-white text-gray-900 border-gray-200"
      }`}
      style={{
        height: "calc(98vh - 100px)",
      }}
    >
      <CardBody className="p-0">
        <div
          className="flex overflow-hidden rounded-lg"
          style={{
            height: "calc(100vh - 130px)",
          }}
        >
          <div
            className={`transition-all duration-300 ${
              sidebarOpen ? "w-64" : "w-16"
            } border-r ${
              resolvedTheme === "light"
                ? "border-gray-300 bg-gray-50"
                : "border-gray-700 bg-gray-800"
            } flex flex-col`}
          >
            <div
              className={`flex items-center justify-between px-4 border-b h-14 ${
                resolvedTheme === "light"
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-700 bg-gray-800"
              }`}
            >
              <h3 className="text-lg font-semibold truncate">
                {sidebarOpen ? teamName : teamName.charAt(0)}
              </h3>
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[calc(100vh-200px)]">
              {channels.map((channel) => (
                <Button
                  key={channel.id}
                  variant={selectedChannel === channel.id ? "solid" : "ghost"}
                  color={
                    selectedChannel === channel.id ? "secondary" : "default"
                  }
                  className="justify-start w-full"
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <span className="mr-2 text-gray-500">#</span>
                  {sidebarOpen ? channel.name : channel.name.charAt(0)}
                </Button>
              ))}
            </div>
          </div>
          <div
            className={`flex flex-col flex-1 ${
              resolvedTheme === "light"
                ? "bg-white text-gray-800"
                : "bg-gray-900 text-gray-200"
            }`}
          >
            <div
              className={`flex items-center justify-between px-4 py-3 ${resolvedTheme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}
                h-14`}
            >
              <h3 className="text-lg font-semibold">
                {selectedChannel ? (
                  <>
                    <span className="mr-1 text-gray-500">#</span>
                    {channels.find((c) => c.id === selectedChannel)?.name}
                  </>
                ) : (
                  "Select a Channel"
                )}
              </h3>
              <Button
                color="danger"
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? "..." : "Disconnect"}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-310px)]">
              {messageLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner size="lg" />
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const isSystemMessage =
                    msg.text?.includes("Processing your request") ||
                    msg.text?.includes("Creating card") ||
                    msg.text?.includes("Successfully created card") ||
                    msg.text?.includes("not found or you don't have access.") ||
                    msg.text?.includes("User authentication failed")

                  if (
                    isSystemMessage &&
                    !msg.text?.includes("Successfully created card") &&
                    !msg.text?.includes("Failed to")
                  ) {
                    return null
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-2 transition-colors rounded-lg ${
                        resolvedTheme === "light"
                          ? "hover:bg-gray-100"
                          : "hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar
                          size="md"
                          src={
                            isSystemMessage
                              ? "/syncup-bot.png"
                              : msg?.user?.image || "/default-avatar.png"
                          }
                          name={
                            isSystemMessage
                              ? "SyncUp Bot"
                              : msg?.user?.name || "User"
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-baseline">
                            <span className="mr-2 font-medium">
                              {isSystemMessage
                                ? "SyncUp Bot"
                                : msg?.user?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(
                                new Date(parseFloat(msg.ts) * 1000),
                                "HH:mm",
                              )}
                            </span>
                          </div>
                          <p
                            className={`mt-1 break-words ${
                              isSystemMessage
                                ? msg.text?.includes("Successfully")
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                                : "text-gray-800 dark:text-gray-200"
                            }`}
                            dangerouslySetInnerHTML={{ __html: msg.text }}
                          />
                        </div>
                      </div>
                      <Divider className="mt-2 opacity-0 group-hover:opacity-100" />
                    </div>
                  )
                })
              ) : (
                <div className="py-6 text-center text-gray-500">
                  No messages yet
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div
              className={`sticky bottom-0 left-0 px-4 pb-4 right-4 border-t ${
                resolvedTheme === "light"
                  ? "bg-gray-50 border-gray-300"
                  : "bg-gray-800 border-gray-700"
              }`}
            >
              {selectedChannel && (
                <div className="relative flex items-center">
                  <div className="relative flex-1 overflow-hidden border rounded-lg">
                    <ReactQuill
                      value={newMessage}
                      onChange={setNewMessage}
                      placeholder={`Message #${
                        channels.find((c) => c.id === selectedChannel)?.name ||
                        "channel"
                      }`}
                      className={`${
                        resolvedTheme === "dark"
                          ? "bg-gray-900 text-gray-100"
                          : "bg-white text-gray-900"
                      }`}
                      theme="snow"
                      style={{
                        height: "120px",
                        borderRadius: "0.375rem",
                        borderBottomRightRadius: "0",
                        marginBottom: "0px",
                        paddingBottom: "0px",
                      }}
                    />
                    <div className="absolute flex p-1 right-8 bottom-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!loading && newMessage.trim()) sendMessage()
                        }}
                        disabled={loading || !newMessage.trim()}
                        className="flex items-center justify-center w-auto h-10 px-4 text-white rounded bg-secondary hover:bg-teal-700 disabled:opacity-50"
                        aria-label="Send message"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin" />
                        ) : (
                          <MdSend />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

SlackChat.propTypes = {
  token: PropTypes.string.isRequired,
  teamName: PropTypes.string.isRequired,
  onDisconnect: PropTypes.func.isRequired,
  isDisconnecting: PropTypes.bool.isRequired,
}

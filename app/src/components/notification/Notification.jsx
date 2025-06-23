import React, { useState, useEffect, useCallback } from "react"
import Typography from "@mui/material/Typography"
import { format } from "date-fns"
import NotificationsIcon from "@mui/icons-material/Notifications"
import { useSession } from "next-auth/react"
import PropTypes from "prop-types"
import { useTheme } from "next-themes"

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Listbox,
  ListboxItem,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
} from "@heroui/react"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import debounce from "lodash.debounce"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"
import {
  fetchNotifications,
  markNotificationAsRead,
} from "@/src/components/notification/NotificationData"
import deleteNotification from "@/src/components/notification/clearAllNotifications"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"
import { mapEventToMessage } from "./eventMapper"

function NotificationModal({ open, handleClose, anchorel }) {
  const [notifications, setNotifications] = useState([])
  const [showListbox, setShowListbox] = useState(false)
  const [selected, setSelected] = useState("0")
  const { setcreatenotification } = useGlobalSyncupContext()
  const { data: session } = useSession()
  const { allUserData } = useGlobalSyncupContext()
  const { theme } = useTheme()

  const updateNotificationCount = (notificationList) => {
    if (!notificationList || !Array.isArray(notificationList)) return
    const unreadCount = notificationList.filter(
      (notification) => notification.new,
    ).length
    setcreatenotification(unreadCount)
  }
  const getInitials = (name) => {
    if (!name) return ""
    const nameParts = name.split(" ")
    const initials = nameParts
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2)
    return initials
  }
  const handleFetchedNotifications = async () => {
    const fetchedNotifications = await fetchNotifications(session?.user?.email)
    setNotifications(fetchedNotifications)
    updateNotificationCount(fetchedNotifications)
  }
  useEffect(() => {
    handleFetchedNotifications()
  }, [])

  const debouncedFetchNotifications = useCallback(
    debounce(() => {
      if (session?.user?.email) {
        handleFetchedNotifications(session.user.email)
      }
    }, 500),
    [session?.user?.email],
  )

  useEffect(() => {
    debouncedFetchNotifications()
    return () => debouncedFetchNotifications.cancel()
  }, [debouncedFetchNotifications])
  const handleCloseModal = () => {
    handleClose()
  }

  useEffect(() => {
    const fetchNotificationsPeriodically = async () => {
      try {
        const fetchedNotifications = await fetchNotifications(
          session?.user?.email,
        )
        setNotifications(fetchedNotifications)
        updateNotificationCount(fetchedNotifications)
      } catch (error) {
        showErrorToast("Error fetching notifications")
      }
    }
    const intervalId = setInterval(fetchNotificationsPeriodically, 10000)
    return () => clearInterval(intervalId)
  }, [session?.user?.email])
  const handleNotificationClick = async (notificationId) => {
    try {
      const clickedNotification = notifications.find(
        (notification) => notification.id === notificationId,
      )
      if (!clickedNotification?.new) {
        return
      }
      await markNotificationAsRead(notificationId)
      setNotifications((prevNotifications) => {
        const updatedNotifications = prevNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, new: false }
            : notification,
        )
        updateNotificationCount(updatedNotifications)
        return updatedNotifications
      })
      showSuccessToast("Notification marked as read.")
    } catch (error) {
      showErrorToast("Error updating notification")
    }
  }
  const handleDelete = async () => {
    try {
      await deleteNotification()
      setNotifications([])
      setcreatenotification(0)
      handleClose()
      showSuccessToast("All notifications cleared.")
    } catch (error) {
      showErrorToast("Error deleting notifications")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => n.new)
      await Promise.all(
        unreadNotifications.map((notification) =>
          markNotificationAsRead(notification.id),
        ),
      )
      setNotifications((prevNotifications) => {
        const updatedNotifications = prevNotifications.map((notification) => ({
          ...notification,
          new: false,
        }))
        updateNotificationCount(updatedNotifications)
        return updatedNotifications
      })
      showSuccessToast("All notifications marked as read.")
      handleClose()
    } catch (error) {
      showErrorToast("Error marking all notifications as read")
    }
  }

  return (
    <Popover
      placement="bottom-end"
      offset={22}
      trigger="click"
      isOpen={open}
      onClose={handleCloseModal}
      anchorel={anchorel}
    >
      <PopoverTrigger>
        <div />
      </PopoverTrigger>
      <PopoverContent className="dark:bg">
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", marginLeft: "auto" }}
        >
          <span
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              marginTop: "10px",
              marginRight: "16px",
              color: theme === "dark" ? "white" : "black",
            }}
          >
            <NotificationsIcon
              sx={{
                fontSize: "1.6rem",
                marginRight: 0.5,
                marginBottom: 0.5,
                color: theme === "dark" ? "white" : "black",
              }}
            />
            All Notifications
            <Popover
              placement="bottom-start"
              offset={1}
              trigger="click"
              isOpen={showListbox}
              onClose={() => setShowListbox(true)}
              anchorel={anchorel}
            >
              <PopoverTrigger>
                <MoreVertIcon
                  sx={{
                    fontSize: "1.8rem",
                    marginLeft: 12,
                    color: theme === "dark" ? "white" : "black",
                  }}
                  onClick={() => setShowListbox(!showListbox)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setShowListbox(!showListbox)
                    }
                  }}
                />
              </PopoverTrigger>
              <PopoverContent>
                <Listbox aria-label="Actions">
                  {selected !== "1" && (
                    <ListboxItem
                      key="mark-all"
                      sx={{ fontSize: "0.1rem" }}
                      className="hover:bg-purple-300"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark All as Read
                    </ListboxItem>
                  )}
                  <ListboxItem
                    key="clear-all"
                    sx={{ fontSize: "0.1rem" }}
                    onClick={handleDelete}
                    className="hover:bg-purple-300"
                  >
                    Clear All
                  </ListboxItem>
                </Listbox>
              </PopoverContent>
            </Popover>
          </span>
        </Typography>
        <Tabs
          aria-label="Options"
          selectedKey={selected}
          onSelectionChange={setSelected}
          style={{
            maxHeight: 400,
            width: 315,
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          <Tab key="0" title="Unread Notifications">
            <div
              style={{
                maxHeight: 400,
                width: 315,
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
            >
              {notifications &&
              notifications.filter((notification) => notification.new)
                .length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    marginTop: "10px",
                    color: "gray",
                  }}
                >
                  No unread notifications
                </Typography>
              ) : (
                notifications
                  .filter((notification) => notification.new)
                  .map((notification) => (
                    <React.Fragment key={notification.id}>
                      <div style={{ marginTop: "4px" }}>
                        <div
                          key={notification.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor:
                              theme === "dark" ? "#7754bd" : "#d4c5eb",
                            borderRadius: "10px",
                            cursor: "pointer",
                            fontFamily: "sans-serif",
                            padding: "8px",
                          }}
                          onClick={() =>
                            handleNotificationClick(notification.id)
                          }
                          role="button"
                          tabIndex={0}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleNotificationClick(notification.id)
                            }
                          }}
                        >
                          <Tooltip
                            placement="bottom"
                            showArrow
                            content={notification.author}
                          >
                            <Avatar
                              isBordered
                              color="secondary"
                              name={getInitials(notification.author)}
                              src={
                                allUserData?.find(
                                  (user) => user.name === notification.author,
                                )?.photo || null
                              }
                              size="sm"
                              style={{
                                marginRight: "8px",
                                fontSize: "14px",
                                fontWeight: "bold",
                                backgroundColor: "#d4c5eb",
                                color: "#7754bd",
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                flexShrink: 0,
                              }}
                            />
                          </Tooltip>
                          <div
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="black"
                              fontFamily="sans-serif"
                              sx={{ marginTop: "4px", fontSize: "12px" }}
                              dangerouslySetInnerHTML={{
                                __html: mapEventToMessage(
                                  notification.event,
                                  notification.author,
                                  notification.details,
                                ),
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="black"
                              sx={{
                                fontSize: "10px",
                              }}
                            >
                              {format(
                                notification.createdAt,
                                "dd MMM yyyy HH:mm",
                              )}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))
              )}
            </div>
          </Tab>
          <Tab key="1" title="Read Notifications" className="pr-2">
            <div
              style={{
                maxHeight: 400,
                width: 315,
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
            >
              {notifications.filter((notification) => !notification.new)
                .length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    marginTop: "10px",
                    color: "gray",
                  }}
                >
                  No read notifications
                </Typography>
              ) : (
                notifications
                  .filter((notification) => !notification.new)
                  .map((notification) => (
                    <React.Fragment key={notification.id}>
                      <div
                        key={notification.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          backgroundColor: "inherit",
                          cursor: "pointer",
                          fontFamily: "sans-serif",
                          padding: "8px",
                          borderBottom: "1px solid #7754bd",
                        }}
                        onClick={() => handleNotificationClick(notification.id)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleNotificationClick(notification.id)
                          }
                        }}
                      >
                        <Tooltip
                          placement="bottom"
                          showArrow
                          content={notification.author}
                        >
                          <Avatar
                            isBordered
                            color="secondary"
                            name={getInitials(notification.author)}
                            src={
                              allUserData?.find(
                                (user) => user.name === notification.author,
                              )?.photo || null
                            }
                            size="sm"
                            style={{
                              marginRight: "8px",
                              fontSize: "14px",
                              fontWeight: "bold",
                              backgroundColor: "#d4c5eb",
                              color: "#7754bd",
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              flexShrink: 0,
                            }}
                          />
                        </Tooltip>
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ marginTop: "4px", fontSize: "12px" }}
                            dangerouslySetInnerHTML={{
                              __html: mapEventToMessage(
                                notification.event,
                                notification.author,
                                notification.details,
                              ),
                            }}
                          />
                          <Typography
                            className="dark:text-text"
                            variant="body2"
                            color="textSecondary"
                            sx={{
                              fontSize: "10px",
                            }}
                          >
                            {format(
                              notification.createdAt,
                              "dd MMM yyyy HH:mm",
                            )}
                          </Typography>
                        </div>
                      </div>
                    </React.Fragment>
                  ))
              )}
            </div>
          </Tab>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

NotificationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  anchorel: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
}
NotificationModal.defaultProps = {
  anchorel: null,
}
export default NotificationModal

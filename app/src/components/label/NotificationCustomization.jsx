"use client"

import React, { useState, useEffect } from "react"
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Switch,
} from "@heroui/react"
import { useSession } from "next-auth/react"
import { showErrorToast } from "@/src/utils/toastUtils"
import {
  saveNotificationPreferences,
  fetchNotificationPreferences,
} from "@/src/components/notification/NotificationData"

const notificationCategories = {
  events: [
    { key: "cardEvents", label: "Card Events" },
    { key: "boardEvents", label: "Board Events" },
  ],
  activities: [
    { key: "teamAssignment", label: "Team Assigned/Unassigned" },
    { key: "userAssignment", label: "User Assigned/Unassigned" },
    { key: "descriptionUpdates", label: "Description Updates" },
    { key: "categoryChanges", label: "Category Changes" },
    { key: "cardRenames", label: "Card Renames" },
    { key: "checklistUpdates", label: "Checklist Updates" },
    { key: "attachments", label: "Attachments" },
    { key: "priorityChanges", label: "Priority Changes" },
    { key: "dateChanges", label: "Date Changes" },
    { key: "labelChanges", label: "Label Changes" },
    { key: "dependencyUpdates", label: "Dependency Updates" },
  ],
}

function NotificationCus() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [switchStates, setSwitchStates] = useState(() => {
    const defaultStates = {}
    Object.keys(notificationCategories).forEach((category) => {
      notificationCategories[category].forEach(({ key }) => {
        defaultStates[key] = true
      })
    })
    return defaultStates
  })

  useEffect(() => {
    const initializePreferences = async () => {
      if (session?.user?.email) {
        setLoading(true)
        try {
          console.log("Fetching preferences for:", session.user.email)
          const preferences = await fetchNotificationPreferences(
            session.user.email,
          )
          if (!preferences || Object.keys(preferences).length === 0) {
            await saveNotificationPreferences(session.user.email, switchStates)
          } else {
            const mergedPreferences = { ...switchStates, ...preferences }
            setSwitchStates(mergedPreferences)
          }
        } catch (error) {
          showErrorToast("Error fetching notification preferences")
        } finally {
          setLoading(false)
        }
      }
    }

    initializePreferences()
  }, [session])

  const handleToggle = async (key) => {
    const newState = !switchStates[key]
    const updatedStates = { ...switchStates, [key]: newState }

    console.log("Toggling:", key, "to", newState)
    setSwitchStates(updatedStates)

    try {
      if (session?.user?.email) {
        setLoading(true)
        await saveNotificationPreferences(session.user.email, updatedStates)
      } else {
        showErrorToast("User email not found")
      }
    } catch (error) {
      showErrorToast("Error saving notification preferences")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        maxHeight: "400px",
        overflowY: "auto",
        scrollbarWidth: "thin",
      }}
    >
      <Table aria-label="Notification Preferences" className="w-full">
        <TableHeader>
          <TableColumn>Notification Type</TableColumn>
          <TableColumn>Enable/Disable</TableColumn>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2} style={{ fontWeight: "bold" }}>
              Event Notifications
            </TableCell>
          </TableRow>
          {notificationCategories.events.map(({ key, label }) => (
            <TableRow key={key}>
              <TableCell>{label}</TableCell>
              <TableCell>
                <Switch
                  isSelected={switchStates[key] || false}
                  onValueChange={() => handleToggle(key)}
                  color="secondary"
                  isDisabled={loading}
                />
              </TableCell>
            </TableRow>
          ))}

          <TableRow>
            <TableCell colSpan={2} style={{ fontWeight: "bold" }}>
              Activity Notifications in Cards
            </TableCell>
          </TableRow>
          {notificationCategories.activities.map(({ key, label }) => (
            <TableRow key={key}>
              <TableCell>{label}</TableCell>
              <TableCell>
                <Switch
                  isSelected={switchStates[key] || false}
                  onValueChange={() => handleToggle(key)}
                  color="secondary"
                  isDisabled={loading}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default NotificationCus

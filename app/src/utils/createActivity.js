import { mapEventToMessage } from "@/src/components/notification/eventMapper"

export const createActivity = (eventType, authorName, cardId, details = "") => {
  const activityMessage = mapEventToMessage(eventType, authorName, details)

  return {
    id: Date.now(),
    cardId,
    eventType,
    details: activityMessage,
    triggeredBy: authorName,
    createdAt: new Date().toISOString(),
    type: "activity",
  }
}

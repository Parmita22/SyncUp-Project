import { NotificationEvent } from "@prisma/client"

export const NotificationEventConstants = {
  CARD_CREATED: NotificationEvent.CARD_CREATED,

  CARD_UPDATED: NotificationEvent.CARD_UPDATED,

  CARD_RENAMED: NotificationEvent.CARD_RENAMED,
  CATEGORY_CHANGED: NotificationEvent.CATEGORY_CHANGED,

  CARD_DELETED: NotificationEvent.CARD_DELETED,

  BOARD_CREATED: NotificationEvent.BOARD_CREATED,

  BOARD_DELETED: NotificationEvent.BOARD_DELETED,

  BOARD_UPDATED: NotificationEvent.BOARD_UPDATED,

  CARD_DESCRIPTION_UPDATED: NotificationEvent.CARD_DESCRIPTION_UPDATED,

  CARD_DATES_UPDATED: NotificationEvent.CARD_DATES_UPDATED,

  CARD_PRIORITY_UPDATED: NotificationEvent.CARD_PRIORITY_UPDATED,

  USER_ASSIGNED: NotificationEvent.USER_ASSIGNED,

  USER_UNASSIGNED: NotificationEvent.USER_UNASSIGNED,

  ATTACHMENT_ADDED: NotificationEvent.ATTACHMENT_ADDED,

  LABEL_ADDED: NotificationEvent.LABEL_ADDED,

  LABEL_REMOVED: NotificationEvent.LABEL_REMOVED,

  COMMENT_ADDED: NotificationEvent.COMMENT_ADDED,

  TEAM_ASSIGNED_TO_CARD: NotificationEvent.TEAM_ASSIGNED_TO_CARD,

  TEAM_UNASSIGNED_FROM_CARD: NotificationEvent.TEAM_UNASSIGNED_FROM_CARD,
  CHECKLIST_ITEM_ADDED: NotificationEvent.CHECKLIST_ITEM_ADDED,

  CHECKLIST_ITEM_DELETED: NotificationEvent.CHECKLIST_ITEM_DELETED,

  CHECKLIST_ITEM_CONVERTED_TO_CARD:
    NotificationEvent.CHECKLIST_ITEM_CONVERTED_TO_CARD,
  CHECKLIST_GEN_ITEM_ADDED: NotificationEvent.CHECKLIST_GEN_ITEM_ADDED,
  CHECKLIST_DELETE_ALL: NotificationEvent.CHECKLIST_DELETE_ALL,
  DEPENDENCY_ADDED: NotificationEvent.DEPENDENCY_ADDED,
  DEPENDENCY_REMOVED: NotificationEvent.DEPENDENCY_REMOVED,
} as const
export const preferenceToEventTypeMapping = {
  teamAssignment: [
    NotificationEventConstants.TEAM_ASSIGNED_TO_CARD,
    NotificationEventConstants.TEAM_UNASSIGNED_FROM_CARD,
  ],
  userAssignment: [
    NotificationEventConstants.USER_ASSIGNED,
    NotificationEventConstants.USER_UNASSIGNED,
  ],
  descriptionUpdates: [NotificationEventConstants.CARD_DESCRIPTION_UPDATED],
  cardUpdates: [NotificationEventConstants.CARD_UPDATED],
  attachments: [NotificationEventConstants.ATTACHMENT_ADDED],
  categoryChanges: [
    NotificationEventConstants.CATEGORY_CHANGED,
    NotificationEventConstants.CARD_UPDATED,
  ],
  checklistUpdates: [
    NotificationEventConstants.CHECKLIST_ITEM_ADDED,
    NotificationEventConstants.CHECKLIST_ITEM_DELETED,
    NotificationEventConstants.CHECKLIST_ITEM_CONVERTED_TO_CARD,
    NotificationEventConstants.CHECKLIST_GEN_ITEM_ADDED,
    NotificationEventConstants.CHECKLIST_DELETE_ALL,
  ],
  cardRenames: [NotificationEventConstants.CARD_RENAMED],
  priorityChanges: [NotificationEventConstants.CARD_PRIORITY_UPDATED],
  dateChanges: [NotificationEventConstants.CARD_DATES_UPDATED],
  labelChanges: [
    NotificationEventConstants.LABEL_ADDED,
    NotificationEventConstants.LABEL_REMOVED,
  ],
  dependencyUpdates: [
    NotificationEventConstants.DEPENDENCY_ADDED,
    NotificationEventConstants.DEPENDENCY_REMOVED,
  ],
}

export type NotificationEventConstants =
  (typeof NotificationEventConstants)[keyof typeof NotificationEventConstants]

export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return ""
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export const mapEventToMessage = (
  event: NotificationEventConstants,
  author: string,
  details: string,
): string => {
  const capitalizedAuthor = capitalizeFirstLetter(author || "")

  const truncatedAuthor =
    capitalizedAuthor.length > 30
      ? `${capitalizedAuthor.substring(0, 30)}...`
      : capitalizedAuthor
  const truncatedDetails =
    (details || "").length > 30
      ? `${(details || "").substring(0, 30)}...`
      : details || ""

  const boldAuthor = `<strong>${truncatedAuthor}</strong>`
  const boldDetails = `<strong>${truncatedDetails}</strong>`

  switch (event) {
    case NotificationEventConstants.CARD_CREATED: {
      return `A new card ${boldDetails} was created by ${boldAuthor}.`
    }

    case NotificationEventConstants.CARD_UPDATED: {
      return `The status of card ${boldDetails} was updated by ${boldAuthor}.`
    }

    case NotificationEventConstants.CARD_RENAMED: {
      return `The card ${boldDetails} was renamed by ${boldAuthor}.`
    }

    case NotificationEventConstants.CARD_DELETED: {
      return `The card ${boldDetails} was deleted by ${boldAuthor}.`
    }

    case NotificationEventConstants.CATEGORY_CHANGED: {
      return `The category of card ${boldDetails} was changed by ${boldAuthor}.`
    }
    case NotificationEventConstants.BOARD_CREATED: {
      return `A new board ${boldDetails} was created by ${boldAuthor}.`
    }

    case NotificationEventConstants.BOARD_DELETED: {
      return `The board ${boldDetails} was deleted by ${boldAuthor}.`
    }

    case NotificationEventConstants.BOARD_UPDATED: {
      return `The board ${boldDetails} was updated by ${boldAuthor}.`
    }

    case NotificationEventConstants.CARD_DESCRIPTION_UPDATED: {
      return `The description of card was updated by ${boldAuthor}.`
    }

    case NotificationEventConstants.CARD_DATES_UPDATED: {
      return `The dates of card ${boldDetails} were updated by ${boldAuthor}.`
    }

    case NotificationEventConstants.CARD_PRIORITY_UPDATED: {
      return `The priority of card ${boldDetails} was updated by ${boldAuthor}.`
    }

    case NotificationEventConstants.ATTACHMENT_ADDED: {
      return `${boldAuthor} added an attachment to the card ${boldDetails}.`
    }

    case NotificationEventConstants.LABEL_ADDED: {
      return `The label was added to the card ${boldDetails} by ${boldAuthor}.`
    }

    case NotificationEventConstants.LABEL_REMOVED: {
      return `The label was removed from the card ${boldDetails} by ${boldAuthor}.`
    }

    case NotificationEventConstants.USER_ASSIGNED: {
      return `<strong>${capitalizeFirstLetter(author)}</strong> assigned <strong>${capitalizeFirstLetter(
        details,
      )}</strong> to the card.`
    }

    case NotificationEventConstants.USER_UNASSIGNED: {
      return `<strong>${capitalizeFirstLetter(author)}</strong> removed <strong>${capitalizeFirstLetter(
        details,
      )}</strong> from the card.`
    }

    case NotificationEventConstants.COMMENT_ADDED: {
      return `A new comment was added by ${boldAuthor}: ${boldDetails}`
    }

    case NotificationEventConstants.TEAM_ASSIGNED_TO_CARD: {
      return `A team was assigned to the card  by ${boldAuthor}.`
    }

    case NotificationEventConstants.TEAM_UNASSIGNED_FROM_CARD: {
      return `A team was unassigned from the card by ${boldAuthor}.`
    }
    case NotificationEventConstants.CHECKLIST_ITEM_ADDED: {
      return `${boldAuthor} added checklist item ${boldDetails} to the card.`
    }
    case NotificationEventConstants.CHECKLIST_ITEM_DELETED: {
      return `${boldAuthor} deleted checklist item ${boldDetails} from the card.`
    }
    case NotificationEventConstants.CHECKLIST_ITEM_CONVERTED_TO_CARD: {
      return `${boldAuthor} converted checklist item ${boldDetails} to a card.`
    }
    case NotificationEventConstants.CHECKLIST_GEN_ITEM_ADDED: {
      return `${boldAuthor} added a AI generated checklist item to the card ${boldDetails}.`
    }
    case NotificationEventConstants.CHECKLIST_DELETE_ALL: {
      return `${boldAuthor} deleted all checklist items from the card ${boldDetails}.`
    }
    case NotificationEventConstants.DEPENDENCY_ADDED: {
      return `${boldAuthor} added a dependency to the card ${boldDetails}.`
    }
    case NotificationEventConstants.DEPENDENCY_REMOVED: {
      return `${boldAuthor} removed a dependency from the card ${boldDetails}.`
    }

    default: {
      return ""
    }
  }
}

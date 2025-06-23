import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"

export enum Role {
  SuperAdmin = "SuperAdmin",
  Admin = "Admin",
  User = "User",
}

export enum Permissions {
  createBoard,
  editBoard,
  updateRole,
  readBoard,
  deleteBoard,
  createCard,
  editCard,
  deleteCard,
  addingMember,
  deleteAccount,
  editOrganisation,
  viewFeedback,
}

export function getPermissions(role: Role): Permissions[] {
  switch (role) {
    case Role.SuperAdmin:
      return [
        Permissions.createBoard,
        Permissions.editBoard,
        Permissions.updateRole,
        Permissions.readBoard,
        Permissions.deleteBoard,
        Permissions.editCard,
        Permissions.createCard,
        Permissions.deleteCard,
        Permissions.addingMember,
        Permissions.deleteAccount,
        Permissions.editOrganisation,
        Permissions.viewFeedback,
      ]
    case Role.Admin:
      return [
        Permissions.createBoard,
        Permissions.editBoard,
        Permissions.readBoard,
        Permissions.viewFeedback,
      ]
    case Role.User:
      return [
        Permissions.createCard,
        Permissions.editCard,
        Permissions.deleteCard,
        Permissions.addingMember,
        Permissions.deleteAccount,
      ]
    default:
      return []
  }
}
export function hasAccess(action: Permissions): boolean {
  const { userInfo } = useGlobalSyncupContext()
  if (!userInfo) {
    return false
  }

  const userRole = userInfo.role
  const accessLevels = getPermissions(userRole)
  return accessLevels.includes(action)
}

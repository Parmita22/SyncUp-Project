"use server"

import bcrypt from "bcryptjs"
import { showErrorToast } from "../src/utils/toastUtils"
import prisma from "@/src/lib/prisma"

export default async function UserInsert(params: any) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: params.email,
    },
  })

  if (existingUser) {
    return { message: "User already exists" }
  }

  const hashedPassword = bcrypt.hashSync(
    params.password,
    parseInt(process.env.BCRYPT_SALT, 10),
  )

  const newUser = await prisma.user.create({
    data: {
      name: params.name,
      email: params.email,
      password: hashedPassword,
    },
  })

  return newUser
}
export async function User(userEmail, organizationname) {
  if (organizationname === undefined) {
    return null
  }
  const user = await prisma.UserOrganization.findUnique({
    where: {
      email_organizationName: {
        email: userEmail,
        organizationName: organizationname,
      },
    },
  })
  return user
}

export async function UserData(userEmail) {
  const user = await prisma.user.findUnique({
    where: {
      email: userEmail,
    },
    include: {
      boards: {
        include: {
          organization: true,
        },
      },
      organizations: true,
      team: {
        include: {
          boards: true,
        },
      },
      cards: {
        where: {
          AND: [{ status: "active" }, { release: "UNRELEASED" }],
        },
        include: {
          task: {
            include: {
              board: true,
            },
          },
        },
      },
    },
  })
  return user
}

export const updateUser = async ({
  name,
  role,
  phone,
  password,
  userEmail,
}) => {
  try {
    await prisma.user.update({
      where: {
        email: userEmail,
      },
      data: {
        name,
        role,
        phone,
        password,
      },
    })

    return true
  } catch (error) {
    return false
  }
}
export const updateProfile = async ({ iName, imagePath, userEmail }) => {
  await prisma.user.update({
    where: { email: userEmail },
    data: {
      imageName: iName,
      photo: imagePath,
    },
  })
}

export const userList = async (organizationname) => {
  const users = await prisma.user.findMany({
    where: {
      organizations: {
        some: {
          name: organizationname,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
    include: {
      userOrganizations: true,
      notifications: true,
    },
  })
  return users
}

export const updateUserRole = async ({ email, role, organizationname }) => {
  await prisma.UserOrganization.update({
    where: {
      email_organizationName: {
        email,
        organizationName: organizationname,
      },
    },
    data: {
      role,
    },
  })

  await prisma.user.update({
    where: {
      email,
    },
    data: {
      role,
    },
  })

  return true
}
export const deleteUser = async (userId: number) => {
  try {
    await prisma.userOrganization.deleteMany({
      where: {
        user: {
          id: userId,
        },
      },
    })

    await prisma.user.delete({
      where: {
        id: userId,
      },
    })

    return true
  } catch (error) {
    showErrorToast("Error deleting user")
    return false
  }
}

export const createUser = async ({ name, email, phone, role }) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  })
  try {
    if (existingUser) {
      return { message: "User already exists." }
    }
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role,
      },
    })
    return newUser
  } catch (error) {
    showErrorToast("Error creating user")
    return false
  }
}

export const removeUserFromOrganization = async (
  email: string,
  organizationName: string,
) => {
  await prisma.userOrganization.delete({
    where: {
      email_organizationName: {
        email,
        organizationName,
      },
    },
  })

  await prisma.organization.update({
    where: {
      name: organizationName,
    },
    data: {
      users: {
        disconnect: {
          email,
        },
      },
    },
  })
}

export const UserExists = async (email: string) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  })
  if (existingUser) {
    return true
  }
  return false
}

export const removeProfilePhoto = async (userEmail: string) => {
  try {
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        photo: null,
        imageName: null,
      },
    })
    return true
  } catch (error) {
    return false
  }
}

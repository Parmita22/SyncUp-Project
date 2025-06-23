"use server"

import { showErrorToast } from "../src/utils/toastUtils"
import prisma from "@/src/lib/prisma"

export async function updateOrganization(updatedOrganizationData) {
  try {
    if (!updatedOrganizationData) {
      showErrorToast(" Updated Organization data is null or undefined")
    }

    const existingOrganization = await prisma.organization.findUnique({
      where: {
        id: updatedOrganizationData.id,
      },
    })

    if (!existingOrganization) {
      showErrorToast("Organization not found")
    }

    const updatedFields = {
      ...(updatedOrganizationData.name && {
        name: updatedOrganizationData.name,
      }),
      ...(updatedOrganizationData.type && {
        type: updatedOrganizationData.type,
      }),
      ...(updatedOrganizationData.description && {
        description: updatedOrganizationData.description,
      }),
    }

    const updatedOrganization = await prisma.organization.update({
      where: {
        id: updatedOrganizationData.id,
      },
      data: updatedFields,
    })

    return updatedOrganization
  } catch (error) {
    showErrorToast("Error updating organization")
    throw error
  }
}

export async function Addorganization(organizationData, userEmail) {
  try {
    if (!organizationData) {
      showErrorToast("Organization data is null or undefined")
    }
    const existingOrganization = await prisma.organization.findFirst({
      where: {
        name: {
          equals: organizationData.name,
          mode: "insensitive",
        },
      },
    })
    if (existingOrganization) {
      showErrorToast("Organization already exists")
    }
    const createdOrganization = await prisma.organization.create({
      data: {
        ...organizationData,
        users: {
          connect: {
            email: userEmail,
          },
        },
      },
    })

    return createdOrganization
  } catch (error) {
    showErrorToast("Error in storing  organization details")
    throw error
  }
}

export async function fetchOrganizationName(email) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      organizations: {
        include: {
          users: {
            include: {
              notifications: true,
              userOrganizations: true,
            },
          },
        },
      },
    },
  })
  return user
}

export async function getAllOrganizations() {
  try {
    const organizations = await prisma.organization.findMany()
    return organizations
  } catch (error) {
    showErrorToast("Error fetching all organizations")
    throw error
  }
}

export async function deleteOrganization(organizationId) {
  try {
    if (!organizationId) {
      showErrorToast("Organization ID is null or undefined")
    }

    const existingOrganization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      include: {
        users: true,
      },
    })

    if (!existingOrganization) {
      showErrorToast("Organization not found")
    }
    await prisma.userOrganization.deleteMany({
      where: {
        organizationName: existingOrganization.name,
      },
    })

    const organisation = await prisma.organization.delete({
      where: {
        id: organizationId,
      },
    })

    return organisation
  } catch (error) {
    showErrorToast("Error deleting organization")
    throw error
  }
}

export async function assignuser(name, email) {
  await prisma.organization.update({
    where: {
      name,
    },
    data: {
      users: {
        connect: {
          email,
        },
      },
    },
  })
}

export async function Adduserorganization(name, email, role) {
  await prisma.UserOrganization.create({
    data: {
      email,
      organizationName: name,
      role,
    },
  })
}

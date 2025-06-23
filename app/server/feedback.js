"use server"

import prisma from "@/src/lib/prisma"

async function submitFeedback(feedbackData) {
  try {
    const organization = await prisma.Organization.findUnique({
      where: { name: feedbackData.organizationName },
    })

    const createdFeedback = await prisma.Feedback.create({
      data: {
        feedback: feedbackData.feedback,
        userId: feedbackData.userId,
        organizationId: organization.id,
      },
    })
    return createdFeedback
  } catch (error) {
    throw new Error(`Error submitting feedback: ${error.message}`)
  }
}

async function fetchFeedbacks(organizationName) {
  try {
    const organization = await prisma.Organization.findUnique({
      where: { name: organizationName },
    })

    const feedbacks = await prisma.Feedback.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        user: true,
      },
    })
    return feedbacks.map((feedback) => ({
      id: feedback.id,
      username: feedback.user.name,
      message: feedback.feedback,
      createdAt: feedback.createdAt,
    }))
  } catch (error) {
    throw new Error("Error fetching feedbacks")
  }
}

async function deleteFeedback(feedbackId) {
  try {
    await prisma.Feedback.delete({
      where: { id: feedbackId },
    })
  } catch (error) {
    throw new Error("Error deleting feedback")
  }
}
export { submitFeedback, fetchFeedbacks, deleteFeedback }

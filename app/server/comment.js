"use server"

import prisma from "@/src/lib/prisma"

export const createComment = async ({
  updateId,
  comment,
  userEmail,
  parentId = null,
}) => {
  const user = await prisma.user.findUnique({
    where: {
      email: userEmail,
    },
  })

  if (!user) {
    throw new Error(`User with email ${userEmail} not found`)
  }
  const newComment = await prisma.comment.create({
    data: {
      description: comment,
      card: parentId ? undefined : { connect: { id: updateId } },
      user: {
        connect: { id: user.id },
      },
      parent: parentId ? { connect: { id: parentId } } : undefined,
    },
    include: {
      user: true,
    },
  })
  return newComment
}

export const allComments = async ({ updateId }) => {
  const comments = await prisma.comment.findMany({
    where: {
      cardId: updateId,
      parentId: null,
    },
    include: {
      user: true,
      replies: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
  return comments
}

export const deleteComment = async ({ commentId }) => {
  await prisma.comment.delete({
    where: {
      id: commentId,
    },
  })
}

export const editComment = async ({ description, commentId }) => {
  await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      description,
    },
  })
}

export const handleAddReply = async ({
  commentId,
  replyText,
  updateId,
  userEmail,
  authorName,
}) => {
  if (!replyText.trim()) {
    throw new Error("Reply text cannot be empty")
  }

  const newReply = await createComment({
    updateId,
    comment: replyText,
    parentId: commentId,
    userEmail,
    authorName,
  })

  return newReply
}

export const toggleCommentLike = async ({ commentId, userEmail }) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    })

    if (!user) {
      throw new Error("User not found")
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        likedBy: true,
      },
    })

    if (!comment) {
      throw new Error("Comment not found")
    }

    const hasLiked = comment.likedBy.some(
      (likedUser) => likedUser.id === user.id,
    )

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        likedBy: {
          [hasLiked ? "disconnect" : "connect"]: { id: user.id },
        },
        likes: hasLiked ? comment.likes - 1 : comment.likes + 1,
      },
      include: {
        likedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    return {
      isLiked: !hasLiked,
      likes: updated.likes,
      likedBy: updated.likedBy,
    }
  } catch (error) {
    console.error("Error toggling comment like:", error)
    throw new Error("Failed to toggle like")
  }
}

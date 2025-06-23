import { toggleCommentLike } from "@/server/comment"

export async function POST(req) {
  try {
    const { commentId, userEmail } = await req.json()
    const updated = await toggleCommentLike({
      commentId,
      userEmail,
    })
    return Response.json(updated)
  } catch (error) {
    console.error("Error toggling like:", error)
    return new Response(JSON.stringify({ error: "Failed to toggle like" }), {
      status: 500,
    })
  }
}

import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request) {
  try {
    const { cardName } = await request.json()
    if (!cardName) {
      return NextResponse.json(
        { error: "Card name is required" },
        { status: 400 },
      )
    }

    const prompt = `Generate a checklist with 5-7 specific, actionable items for a task card titled "${cardName}". 
    Each item should be concise (max 50 characters) and start with a verb. 
    Return only a JSON array of strings without any additional text or explanation.
    Example format: ["First task item", "Second task item", "Third task item"]`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    })

    let checklistItems
    try {
      const content =
        completion.choices[0]?.message?.content
          ?.replace(/^```json\n|\n```$/g, "")
          .trim() || "[]"
      checklistItems = JSON.parse(content)

      if (!Array.isArray(checklistItems)) {
        throw new Error("Invalid response format")
      }
    } catch (parseError) {
      console.error("Parse error:", parseError)
      throw new Error("Failed to parse AI response")
    }

    return NextResponse.json({ items: checklistItems })
  } catch (error) {
    console.error("AI Generation error:", error)
    return NextResponse.json(
      { error: `Failed to generate checklist: ${error.message}` },
      { status: 500 },
    )
  }
}

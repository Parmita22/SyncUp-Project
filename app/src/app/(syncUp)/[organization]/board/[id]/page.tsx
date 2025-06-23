import React from "react"
import Cards from "@/src/components/cards"

interface PageProps {
  params: {
    id: string
    organization: string
  }
}

async function Page({ params }: PageProps) {
  return (
    <div>
      <Cards boardId={parseInt(params.id, 10)} />
    </div>
  )
}

export default Page

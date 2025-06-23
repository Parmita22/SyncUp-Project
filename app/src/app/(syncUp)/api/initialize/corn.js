import "@/server/cornJobs"

export default function handler(req, res) {
  res.status(200).json({ message: "Cron job initialized" })
}

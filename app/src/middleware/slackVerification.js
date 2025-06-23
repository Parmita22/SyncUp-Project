import crypto from "crypto"

export function verifySlackRequest(req, signingSecret) {
  const timestamp = req.headers["x-slack-request-timestamp"]
  const signature = req.headers["x-slack-signature"]

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
  if (timestamp < fiveMinutesAgo) return false

  const { body } = req
  const baseString = `v0:${timestamp}:${body}`
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex")
  const computedSignature = `v0=${hmac}`

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature),
  )
}

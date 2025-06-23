import Handlebars from "handlebars"

import * as sgMail from "@sendgrid/mail"
import userInviteTemplate from "./emailTemplate/userInviteTemplate"

export function sendMail({
  to,
  subject,
  body,
  sendgridKey,
  smtpEmail,
}: {
  to: string
  subject: string
  body: string
  sendgridKey: string
  smtpEmail: string
}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      sgMail.setApiKey(sendgridKey)
      const msg = {
        from: { email: smtpEmail },
        to,
        subject,
        html: body,
      }
      sgMail.send(msg).then(
        () => {},
        (error) => {
          return error
        },
      )
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

export function compileResetPassTemplate(
  name: string,
  url: string,
  orgName: string,
) {
  const template = Handlebars.compile(userInviteTemplate)
  const htmlBody = template({
    name,
    url,
    orgName,
  })
  return htmlBody
}

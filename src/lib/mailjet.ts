import Mailjet from 'node-mailjet';

const mailjet = new Mailjet({
  apiKey: import.meta.env.MJ_APIKEY_PUBLIC || '',
  apiSecret: import.meta.env.MJ_API_SECRET || ''
});

export interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, toName, subject, htmlContent }: SendEmailOptions) {
  try {
    const result = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: "newsletter@veredillasfm.es",
              Name: "Veredillas FM"
            },
            To: [
              {
                Email: to,
                Name: toName
              }
            ],
            Subject: subject,
            HTMLPart: htmlContent,
            CustomID: "WeeklyNewsletter"
          }
        ]
      });
    return { success: true, data: result.body };
  } catch (error) {
    console.error('Mailjet Error:', error);
    return { success: false, error };
  }
}

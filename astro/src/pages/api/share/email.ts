import type { APIRoute } from 'astro';
import Mailjet from 'node-mailjet';

export const prerender = false;

const mj = new Mailjet({
    apiKey: import.meta.env.MJ_APIKEY_PUBLIC.trim(),
    apiSecret: import.meta.env.MJ_API_SECRET.trim()
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const { email, imageData, episodeTitle } = await request.json();

        if (!email || !imageData) {
            return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
        }

        // The imageData expected is a base64 string without the prefix "data:image/png;base64,"
        const base64Content = imageData.split(',')[1] || imageData;

        const result = await mj
            .post("send", { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: "hola@veredillasfm.es",
                            Name: "Veredillas FM"
                        },
                        To: [
                            {
                                Email: email,
                                Name: "Oyente"
                            }
                        ],
                        Subject: `¡Mira tu historia de: ${episodeTitle || 'Veredillas FM'}!`,
                        TextPart: "Aquí tienes la imagen personalizada del episodio que acabas de diseñar. ¡Gracias por escucharnos!",
                        HTMLPart: `
                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #ffffff; padding: 40px 20px; text-align: center;">
                                <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; border-radius: 24px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
                                    <div style="margin-bottom: 30px;">
                                        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.2em; margin: 0;">VEREDILLAS FM</h1>
                                    </div>
                                    <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #8b5cf6, #d946ef); margin: 0 auto 30px auto; border-radius: 10px;"></div>
                                    <h2 style="color: #ffffff; font-size: 28px; line-height: 1.2; font-weight: 900; margin-bottom: 20px;">¡Tu fragmento está listo!</h2>
                                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                        Has personalizado una historia increíble para el episodio:<br>
                                        <strong style="color: #ffffff;">"${episodeTitle || 'Veredillas FM'}"</strong>
                                    </p>
                                    <div style="background: rgba(139, 92, 246, 0.1); padding: 20px; border-radius: 16px; border: 1px dashed rgba(139, 92, 246, 0.4); margin-bottom: 30px;">
                                        <p style="color: #8b5cf6; font-size: 14px; font-weight: 700; margin: 0;">📎 Tienes la imagen adjunta en este correo</p>
                                    </div>
                                    <p style="color: #71717a; font-size: 13px; line-height: 1.6;">
                                        Descarga el archivo adjunto y súbelo directamente a tus Stories de Instagram, TikTok o Facebook para compartirlo con el mundo.
                                    </p>
                                    <div style="margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 30px;">
                                        <p style="color: #52525b; font-size: 11px; margin: 0;">
                                            &copy; ${new Date().getFullYear()} Veredillas FM. Enviado desde nuestro generador de historias premium.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `,
                        Attachments: [
                            {
                                ContentType: "image/png",
                                Filename: `Veredillas_Story_${Date.now()}.png`,
                                Base64Content: base64Content
                            }
                        ]
                    }
                ]
            });

        return new Response(JSON.stringify({ success: true, data: result.body }), { status: 200 });

    } catch (error: any) {
        console.error('Mailjet error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    const BUFFER_TOKEN = import.meta.env.BUFFER_ACCESS_TOKEN;

    if (!BUFFER_TOKEN) {
        return new Response(JSON.stringify({ error: "No se encontro el Token de Buffer en el entorno (.env)" }), { status: 401 });
    }

    try {
        const formData = await request.formData();
        const text = formData.get('text') as string;
        const channelsStr = formData.get('channels') as string;
        const media = formData.get('media') as File | null; // Placeholder para cuando se requiera subir

        if (!text || !channelsStr) {
            return new Response(JSON.stringify({ error: "Texto y canales son requeridos." }), { status: 400 });
        }

        const channels = JSON.parse(channelsStr);

        // Usamos la API de GraphQL de Buffer para crear un Post
        // https://developers.buffer.com/reference/mutations/create-post.html
        // Si hay una imagen/video, se deberia subir a un bucket (ej. S3/R2) primero y proveer la URL publica
        // O usar la API REST antigua de multipart. Por ahora enviamos texto plano.
        
        const query = `
        mutation CreatePost($channels: [String!]!, $text: String!) {
            createPost(channels: $channels, text: $text) {
                id
                text
            }
        }`;

        const variables = {
            channels,
            text
        };

        const res = await fetch('https://api.buffer.com/1/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BUFFER_TOKEN}`
            },
            body: JSON.stringify({ query, variables })
        });

        const data = await res.json();

        if (data.errors) {
            return new Response(JSON.stringify({ error: data.errors[0].message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true, data: data.data }), { status: 200 });

    } catch (e: any) {
        console.error("Error en buffer-proxy:", e);
        return new Response(JSON.stringify({ error: e.message || "Error interno del servidor" }), { status: 500 });
    }
};

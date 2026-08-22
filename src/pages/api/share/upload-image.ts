import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const prerender = false;

const R2_ACCOUNT_ID = import.meta.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = import.meta.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = import.meta.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = import.meta.env.R2_PUBLIC_URL;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const POST: APIRoute = async ({ request }) => {
    try {
        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
            return new Response(JSON.stringify({ error: 'Storage not configured' }), { status: 503 });
        }

        const r2Client = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });

        const body = await request.json();
        const { fileName, contentType } = body;

        if (!fileName || !contentType || !ALLOWED_TYPES.includes(contentType)) {
            return new Response(JSON.stringify({ error: 'Tipo de imagen no permitido' }), { status: 400 });
        }

        const timestamp = Date.now();
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `story-uploads/${timestamp}_${sanitizedName}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });
        const publicUrl = `${R2_PUBLIC_URL}/${key}`;

        return new Response(JSON.stringify({ presignedUrl, publicUrl, key }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error generating image upload URL:', error);
        return new Response(JSON.stringify({ error: 'Error interno al generar URL de subida' }), { status: 500 });
    }
};

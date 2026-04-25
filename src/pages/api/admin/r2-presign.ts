import type { APIRoute } from 'astro';
import { getUserFromCookie } from '@/lib/auth';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const prerender = false;

const R2_ACCOUNT_ID = import.meta.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = import.meta.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = import.meta.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = import.meta.env.R2_PUBLIC_URL;

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const cookieHeader = request.headers.get('cookie');
        const userPayload = getUserFromCookie(cookieHeader);

        if (!userPayload) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        await dbConnect();
        const user = await User.findById(userPayload.userId);
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
        }

        const { fileName, contentType } = await request.json();

        if (!fileName || !contentType) {
            return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400 });
        }

        // Generate a unique key with timestamp to avoid collisions
        const timestamp = Date.now();
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `social-clips/${timestamp}_${sanitizedName}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        // Presigned URL valid for 30 minutes (enough for large video uploads)
        const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 1800 });
        const publicUrl = `${R2_PUBLIC_URL}/${key}`;

        return new Response(JSON.stringify({ presignedUrl, publicUrl, key }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error generating R2 presigned URL:', error);
        return new Response(JSON.stringify({ error: 'Error interno al generar URL' }), { status: 500 });
    }
};

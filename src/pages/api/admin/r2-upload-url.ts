import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import dbConnect from '../../../lib/mongodb';

export const prerender = false;

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

        const accountId = import.meta.env.R2_ACCOUNT_ID;
        const accessKeyId = import.meta.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = import.meta.env.R2_SECRET_ACCESS_KEY;
        const bucketName = import.meta.env.R2_BUCKET_NAME;
        const publicUrlBase = import.meta.env.R2_PUBLIC_URL;

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
            return new Response(JSON.stringify({ error: 'Cloudflare R2 no configurado' }), { status: 500 });
        }
        
        const S3 = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const key = `social-clips/${Date.now()}-${fileName}`;
        
        const signedUrl = await getSignedUrl(S3, new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType,
        }), { expiresIn: 3600 });

        return new Response(JSON.stringify({ 
            uploadUrl: signedUrl, 
            objectKey: key,
            publicUrl: publicUrlBase ? `${publicUrlBase}/${key}` : null
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error generating R2 signed URL:', error);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};

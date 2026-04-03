import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import Clip from '../../../models/Clip';
import { getCollection } from 'astro:content';

export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        // Connect DB
        if (mongoose.connection.readyState !== 1) {
            const MONGODB_URI = import.meta.env.MONGODB_URI;
            if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
            await mongoose.connect(MONGODB_URI);
        }

        // Fetch top 10 clips by likes
        let topClips = await Clip.find({ likes: { $gt: 0 } })
            .sort({ likes: -1 })
            .limit(10)
            .lean();

        // Fetch episode data to enrich clips
        const episodes = await getCollection('episodios');

        // Create a map of videoId -> Clip Metadata
        const clipMetadataMap = new Map();
        const allClips: any[] = [];

        episodes.forEach(ep => {
            if (ep.data.clips) {
                ep.data.clips.forEach(clip => {
                    // Extract ID
                    let videoId = null;
                     const patterns = [
                        /youtube\.com\/shorts\/([^?&]+)/,
                        /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&]+)/,
                        /youtu\.be\/([^?&]+)/,
                        /youtube\.com\/embed\/([^?&]+)/,
                    ];
                    for (const pattern of patterns) {
                        const match = clip.url.match(pattern);
                        if (match) {
                            videoId = match[1];
                            break;
                        }
                    }

                    if (videoId) {
                         const meta = {
                             title: clip.title,
                             episodeTitle: ep.data.title,
                             episodeSlug: ep.slug,
                             episodeImage: ep.data.image,
                             videoId
                         };
                         clipMetadataMap.set(videoId, meta);
                         allClips.push(meta);
                    }
                });
            }
        });

        // Fallback: If no liked clips found, use random clips
        if (topClips.length === 0 && allClips.length > 0) {
            topClips = allClips
                .sort(() => 0.5 - Math.random())
                .slice(0, 8)
                .map(c => ({
                    videoId: c.videoId,
                    likes: 0
                }));
        }

        // Merge DB data with Metadata
        const enrichedClips = topClips.map(dbClip => {
            const meta = clipMetadataMap.get(dbClip.videoId);
            if (!meta) return null; // Skip if we can't find metadata (e.g. clip removed from static files)

            return {
                videoId: dbClip.videoId,
                likes: dbClip.likes,
                title: meta.title,
                episodeTitle: meta.episodeTitle,
                episodeSlug: meta.episodeSlug,
                cover: meta.episodeImage,
                // YouTube Thumbnail
                thumbnail: `https://img.youtube.com/vi/${dbClip.videoId}/hqdefault.jpg`
            };
        }).filter(Boolean);

        return new Response(JSON.stringify(enrichedClips), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching top clips:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

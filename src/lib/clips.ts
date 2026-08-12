export interface ClipLike {
  title: string;
  url: string;
  videoId?: string;
  thumbnailUrl?: string;
}

const YOUTUBE_ID_PATTERNS = [
  /youtube\.com\/shorts\/([^?&]+)/,
  /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&]+)/,
  /youtu\.be\/([^?&]+)/,
  /youtube\.com\/embed\/([^?&]+)/,
];

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function resolveClipVideoId(clip: ClipLike): string | null {
  return clip.videoId || extractYouTubeId(clip.url);
}

export function resolveClipThumbnail(clip: ClipLike): string {
  if (clip.thumbnailUrl) return clip.thumbnailUrl;
  const videoId = resolveClipVideoId(clip);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
}

export interface ClipPlayback {
  kind: 'self-hosted' | 'youtube';
  url: string;
  videoId: string | null;
}

export function resolveClipPlayback(clip: ClipLike): ClipPlayback {
  const youtubeId = extractYouTubeId(clip.url);
  if (youtubeId) {
    return { kind: 'youtube', url: clip.url, videoId: youtubeId };
  }
  return { kind: 'self-hosted', url: clip.url, videoId: clip.videoId || null };
}

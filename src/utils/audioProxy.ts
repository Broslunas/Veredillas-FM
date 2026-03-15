export const PROXY_URL = "https://broslunas-veredillasfm-proxy.hf.space/stream?url=";

export function getProxiedAudioUrl(url: string | null | undefined): string {
    if (!url) return "";
    
    // If it's already proxied, or a YouTube link, don't proxy again
    if (url.includes(PROXY_URL)) return url;
    if (url.includes("youtube.com") || url.includes("youtu.be")) return url;
    
    // We proxy direct audio links to apply volume boost. 
    // This includes Anchor.fm (Spotify) links which are direct audio redirects.
    // We only exclude "open.spotify.com" links which are intended for iframes (embeds).
    if (url.includes("open.spotify.com") && url.includes("/embed/")) return url;
    
    // If it's a direct Spotify link without embed, it's likely a redirector like Anchor or a public podcast link
    // we take the risk of proxying it if it's being used in a custom player context.
    
    // Encode the original URL to be safe as a query parameter
    return `${PROXY_URL}${encodeURIComponent(url)}`;
}

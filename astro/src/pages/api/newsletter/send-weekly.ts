import type { APIRoute } from 'astro';
import { processWeeklyNewsletter } from '../../../lib/newsletter-service';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Check for authorization secret to prevent unauthorized triggers
    const authHeader = request.headers.get('Authorization');
    const secret = import.meta.env.NEWSLETTER_CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return new Response(
        JSON.stringify({ message: "Unauthorized" }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Process the newsletter
    console.log('[Newsletter] Starting weekly process...');
    const startTime = Date.now();
    const results = await processWeeklyNewsletter();
    const duration = Date.now() - startTime;

    console.log(`[Newsletter] Finished. Sent: ${results.sent}, Errors: ${results.errors.length}, Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        message: "Newsletter processing completed", 
        results,
        duration: `${duration}ms`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[Newsletter] Critical Error:", error);
    return new Response(
      JSON.stringify({ 
        message: "Internal Server Error", 
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

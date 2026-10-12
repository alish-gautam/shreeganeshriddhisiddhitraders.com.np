import type { APIRoute } from 'astro';
import { absoluteUrl, DEMO_MODE } from '../lib/site';

export const prerender = false;

export const GET: APIRoute = async () => {
	const body = DEMO_MODE
		? 'User-agent: *\nDisallow: /\n'
		: `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': DEMO_MODE ? 'no-store' : 'public, max-age=3600' } });
};

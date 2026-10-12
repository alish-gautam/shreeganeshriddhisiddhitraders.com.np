import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail } from '../../lib/admin-auth';
import { DEMO_MODE } from '../../lib/site';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
	const key = params.key ?? '';
	if (!/^products\/[a-z0-9-]{8,64}\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(key)) return new Response('Not found', { status: 404 });
	try {
		const image = await env.DB.prepare(
			`SELECT pi.r2_key, pi.mime_type, p.status, p.is_archived, p.is_demo FROM product_images pi
			 JOIN products p ON p.id = pi.product_id WHERE pi.r2_key = ? LIMIT 1`,
		).bind(key).first<{ r2_key: string; mime_type: string; status: string; is_archived: number; is_demo: number }>();
		if (!image) return new Response('Not found', { status: 404 });
		const isPublic = image.status === 'published' && image.is_archived === 0 && (DEMO_MODE || image.is_demo === 0);
		if (!isPublic && !(await getAdminEmail(request))) return new Response('Not found', { status: 404 });
		const object = await env.PRODUCT_IMAGES.get(key);
		if (!object) return new Response('Not found', { status: 404 });
		const headers = new Headers({
			'Content-Type': image.mime_type,
			'X-Content-Type-Options': 'nosniff',
			'Content-Disposition': 'inline',
			'Cache-Control': isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store',
		});
		if (object.httpEtag) headers.set('ETag', object.httpEtag);
		return new Response(object.body, { headers });
	} catch {
		return new Response('Image temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
	}
};

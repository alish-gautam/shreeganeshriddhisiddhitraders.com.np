import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail } from '../../../../lib/admin-auth';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
	if (!(await getAdminEmail(request))) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
	const id = params.id ?? '';
	if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
	try {
		const image = await env.DB.prepare('SELECT r2_key, mime_type FROM product_images WHERE id = ? LIMIT 1')
			.bind(id).first<{ r2_key: string; mime_type: string }>();
		if (!image) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
		const object = await env.PRODUCT_IMAGES.get(image.r2_key);
		if (!object) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
		return new Response(object.body, { headers: {
			'Content-Type': image.mime_type, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff',
			'Cross-Origin-Resource-Policy': 'same-origin', 'Cache-Control': 'private, no-store',
		} });
	} catch {
		return new Response('Image temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
	}
};

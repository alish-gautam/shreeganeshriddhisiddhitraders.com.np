import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getPublishedProductById } from '../../lib/db';
import { bodyIsTooLarge, hasSameOrigin } from '../../lib/admin-auth';
import { validateEmail } from '../../lib/validation';

export const prerender = false;

function redirect(request: Request, path: string): Response {
	return Response.redirect(new URL(path, request.url), 303);
}

export const POST: APIRoute = async ({ request }) => {
	if (!hasSameOrigin(request)) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (bodyIsTooLarge(request, 12_000)) return new Response('Request too large', { status: 413 });
	try {
		const form = await request.formData();
		if (String(form.get('website') ?? '').trim()) return redirect(request, '/contact/?sent=1');
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const phone = String(form.get('phone') ?? '').trim();
		const message = String(form.get('message') ?? '').trim();
		const productId = String(form.get('product_id') ?? '').trim();
		if (name.length < 2 || name.length > 120 || !validateEmail(email) || phone.length > 40 || message.length < 4 || message.length > 4000 || form.get('consent') !== 'on') {
			return redirect(request, '/contact/?error=invalid');
		}
		let validProductId: string | null = null;
		if (productId) {
			const product = await getPublishedProductById(productId);
			if (!product) return redirect(request, '/contact/?error=invalid');
			validProductId = product.id;
		}
		await env.DB.prepare(
			'INSERT INTO enquiries (id, name, email, phone, message, product_id) VALUES (?, ?, ?, ?, ?, ?)',
		).bind(crypto.randomUUID(), name, email, phone, message, validProductId).run();
		return redirect(request, '/contact/?sent=1');
	} catch {
		return redirect(request, '/contact/?error=unavailable');
	}
};

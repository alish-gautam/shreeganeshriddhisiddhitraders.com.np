import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail, bodyIsTooLarge, hasSameOrigin } from '../../../../../lib/admin-auth';
import { detectImageMime } from '../../../../../lib/validation';
import { formText, isFormRequest, redirectTo } from '../../../../../lib/admin-actions';

export const prerender = false;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const POST: APIRoute = async ({ request, params }) => {
	if (!hasSameOrigin(request)) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!(await getAdminEmail(request))) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!isFormRequest(request) || bodyIsTooLarge(request, MAX_IMAGE_BYTES + 20_000)) return new Response('Invalid request', { status: 413, headers: { 'Cache-Control': 'no-store' } });
	const productId = params.id ?? '';
	const productUrl = `/admin/products/${productId}/`;
	let product: { id: string } | null;
	try {
		product = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(productId).first<{ id: string }>();
	} catch {
		return redirectTo(request, `${productUrl}?error=save`);
	}
	if (!product) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
	try {
		const form = await request.formData();
		const intent = formText(form, 'intent', 16);
		const imageId = formText(form, 'image_id', 64);
		if (intent) {
			const rows = await env.DB.prepare('SELECT id, r2_key, position, is_primary FROM product_images WHERE product_id = ? ORDER BY position ASC')
				.bind(productId).all<{ id: string; r2_key: string; position: number; is_primary: number }>();
			const index = rows.results.findIndex((item) => item.id === imageId);
			if (index < 0) return redirectTo(request, `${productUrl}?error=upload`);
			if (intent === 'primary') {
				await env.DB.batch([
					env.DB.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').bind(productId),
					env.DB.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?').bind(imageId, productId),
				]);
			} else if (intent === 'alt') {
				const altText = formText(form, 'alt_text', 220);
				if (altText.length < 4) return redirectTo(request, `${productUrl}?error=upload`);
				await env.DB.prepare('UPDATE product_images SET alt_text = ? WHERE id = ? AND product_id = ?')
					.bind(altText, imageId, productId).run();
			} else if (intent === 'up' || intent === 'down') {
				const nextIndex = index + (intent === 'up' ? -1 : 1);
				if (nextIndex >= 0 && nextIndex < rows.results.length) {
					const current = rows.results[index];
					const next = rows.results[nextIndex];
					await env.DB.batch([
						env.DB.prepare('UPDATE product_images SET position = ? WHERE id = ?').bind(next.position, current.id),
						env.DB.prepare('UPDATE product_images SET position = ? WHERE id = ?').bind(current.position, next.id),
					]);
				}
			} else if (intent === 'delete') {
				const [removed] = rows.results.splice(index, 1);
				await env.DB.prepare('DELETE FROM product_images WHERE id = ? AND product_id = ?').bind(imageId, productId).run();
				if (removed.is_primary && rows.results[0]) {
					await env.DB.batch([
						env.DB.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').bind(productId),
						env.DB.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').bind(rows.results[0].id),
					]);
				}
				try {
					await env.PRODUCT_IMAGES.delete(removed.r2_key);
				} catch {
					return redirectTo(request, `${productUrl}?error=cleanup`);
				}
			} else {
				return new Response('Invalid image action', { status: 400, headers: { 'Cache-Control': 'no-store' } });
			}
			return redirectTo(request, `${productUrl}?saved=1`);
		}
		const candidate = form.get('file');
		if (!(candidate instanceof File) || candidate.size < 12 || candidate.size > MAX_IMAGE_BYTES) return redirectTo(request, `${productUrl}?error=upload`);
		const bytes = new Uint8Array(await candidate.arrayBuffer());
		const mime = detectImageMime(bytes);
		if (!mime || (candidate.type && candidate.type !== mime)) return redirectTo(request, `${productUrl}?error=upload`);
		const altText = formText(form, 'alt_text', 220);
		if (altText.length < 4) return redirectTo(request, `${productUrl}?error=upload`);
		const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
		const key = `products/${productId}/${crypto.randomUUID()}.${extension}`;
		const currentCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM product_images WHERE product_id = ?')
			.bind(productId).first<{ count: number }>();
		await env.PRODUCT_IMAGES.put(key, bytes.buffer as ArrayBuffer, { httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' } });
		try {
			await env.DB.prepare(
				'INSERT INTO product_images (id, product_id, r2_key, alt_text, mime_type, position, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
			).bind(crypto.randomUUID(), productId, key, altText, mime, currentCount?.count ?? 0, currentCount?.count === 0 ? 1 : 0).run();
		} catch {
			try {
				await env.PRODUCT_IMAGES.delete(key);
			} catch {
				return redirectTo(request, `${productUrl}?error=cleanup`);
			}
			throw new Error('Unable to save image record.');
		}
		return redirectTo(request, `${productUrl}?uploaded=1`);
	} catch {
		return redirectTo(request, `${productUrl}?error=save`);
	}
};

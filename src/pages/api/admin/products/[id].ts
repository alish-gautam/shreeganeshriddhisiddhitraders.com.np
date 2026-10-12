import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail, bodyIsTooLarge, hasSameOrigin } from '../../../../lib/admin-auth';
import { isFormRequest, redirectTo } from '../../../../lib/admin-actions';
import { validateProductInput } from '../../../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
	if (!hasSameOrigin(request)) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!(await getAdminEmail(request))) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!isFormRequest(request) || bodyIsTooLarge(request, 24_000)) return new Response('Invalid request', { status: 400, headers: { 'Cache-Control': 'no-store' } });
	const id = params.id ?? '';
	let product: { id: string; slug: string } | null;
	try {
		product = await env.DB.prepare('SELECT id, slug FROM products WHERE id = ?').bind(id).first<{ id: string; slug: string }>();
	} catch {
		return redirectTo(request, `/admin/products/${id}/?error=save`);
	}
	if (!product) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return redirectTo(request, `/admin/products/${id}/?error=invalid`);
	}
	if (form.get('intent') === 'delete') {
		let imageKeys: string[];
		try {
			const images = await env.DB.prepare('SELECT r2_key FROM product_images WHERE product_id = ?').bind(id).all<{ r2_key: string }>();
			imageKeys = images.results.map((image) => image.r2_key);
			await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
		} catch {
			return redirectTo(request, `/admin/products/${id}/?error=save`);
		}
		if (imageKeys.length) {
			try {
				await env.PRODUCT_IMAGES.delete(imageKeys);
			} catch {
				return redirectTo(request, '/admin/products/?error=cleanup');
			}
		}
		return redirectTo(request, '/admin/products/?saved=1');
	}
	let input: ReturnType<typeof validateProductInput>;
	try {
		input = validateProductInput(form);
	} catch {
		return redirectTo(request, `/admin/products/${id}/?error=invalid`);
	}
	let category: { id: string } | null;
	try {
		category = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(input.categoryId).first<{ id: string }>();
	} catch {
		return redirectTo(request, `/admin/products/${id}/?error=save`);
	}
	if (!category) return redirectTo(request, `/admin/products/${id}/?error=category`);
	try {
		await env.DB.prepare(
			`UPDATE products SET slug = ?, name = ?, category_id = ?, short_description = ?, description = ?,
			 price_mode = ?, price_amount = ?, is_featured = ?, status = ?, is_archived = ?, is_demo = ?, specifications_json = ?,
			 seo_title = ?, seo_description = ?, updated_at = datetime('now') WHERE id = ?`,
		).bind(product.slug, input.name, input.categoryId, input.shortDescription, input.description, input.priceMode,
			input.priceAmount, input.featured ? 1 : 0, input.status === 'published' ? 'published' : 'draft', input.status === 'archived' ? 1 : 0,
			input.demo ? 1 : 0, JSON.stringify(input.specifications), input.seoTitle, input.seoDescription, id).run();
		return redirectTo(request, `/admin/products/${id}/?saved=1`);
	} catch {
		return redirectTo(request, `/admin/products/${id}/?error=save`);
	}
};

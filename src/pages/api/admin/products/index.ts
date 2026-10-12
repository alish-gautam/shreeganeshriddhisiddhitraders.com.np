import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail, bodyIsTooLarge, hasSameOrigin } from '../../../../lib/admin-auth';
import { isFormRequest, redirectTo, uniqueSlug } from '../../../../lib/admin-actions';
import { validateProductInput } from '../../../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!hasSameOrigin(request)) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!(await getAdminEmail(request))) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!isFormRequest(request) || bodyIsTooLarge(request, 24_000)) return new Response('Invalid request', { status: 400, headers: { 'Cache-Control': 'no-store' } });
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return redirectTo(request, '/admin/products/new/?error=invalid');
	}
	let input: ReturnType<typeof validateProductInput>;
	try {
		input = validateProductInput(form);
	} catch {
		return redirectTo(request, '/admin/products/new/?error=invalid');
	}
	try {
		const category = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(input.categoryId).first<{ id: string }>();
		if (!category) return redirectTo(request, '/admin/products/new/?error=category');
		const id = crypto.randomUUID();
		const slug = await uniqueSlug('products', input.name);
		await env.DB.prepare(
			`INSERT INTO products (id, slug, name, category_id, short_description, description, price_mode,
			 price_amount, is_featured, status, is_archived, is_demo, specifications_json, seo_title, seo_description)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).bind(id, slug, input.name, input.categoryId, input.shortDescription, input.description, input.priceMode,
			input.priceAmount, input.featured ? 1 : 0, input.status === 'published' ? 'published' : 'draft', input.status === 'archived' ? 1 : 0,
			input.demo ? 1 : 0, JSON.stringify(input.specifications), input.seoTitle, input.seoDescription).run();
		return redirectTo(request, `/admin/products/${id}/?saved=1`);
	} catch {
		return redirectTo(request, '/admin/products/new/?error=save');
	}
};

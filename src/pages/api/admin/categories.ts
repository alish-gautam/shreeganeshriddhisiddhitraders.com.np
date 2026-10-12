import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail, bodyIsTooLarge, hasSameOrigin } from '../../../lib/admin-auth';
import { formText, isFormRequest, redirectTo, uniqueSlug } from '../../../lib/admin-actions';
import { validateCategoryName } from '../../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!hasSameOrigin(request)) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!(await getAdminEmail(request))) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!isFormRequest(request) || bodyIsTooLarge(request, 10_000)) return new Response('Invalid request', { status: 400, headers: { 'Cache-Control': 'no-store' } });
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return redirectTo(request, '/admin/categories/?error=invalid');
	}
	const intent = formText(form, 'intent', 16);
	const id = formText(form, 'id', 64);
	if (intent === 'delete') {
		try {
			const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM products WHERE category_id = ?').bind(id).first<{ count: number }>();
			if (!count || count.count > 0) return redirectTo(request, '/admin/categories/?error=used');
			await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
			return redirectTo(request, '/admin/categories/?saved=1');
		} catch {
			return redirectTo(request, '/admin/categories/?error=save');
		}
	}
	let name: string;
	try {
		name = validateCategoryName(formText(form, 'name', 80));
	} catch {
		return redirectTo(request, '/admin/categories/?error=invalid');
	}
	const description = formText(form, 'description', 500);
	if (id) {
		let exists: { id: string } | null;
		try {
			exists = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(id).first<{ id: string }>();
		} catch {
			return redirectTo(request, '/admin/categories/?error=save');
		}
		if (!exists) return redirectTo(request, '/admin/categories/?error=invalid');
		try {
			await env.DB.prepare("UPDATE categories SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?")
				.bind(name, description, id).run();
		} catch {
			return redirectTo(request, '/admin/categories/?error=save');
		}
	} else {
		try {
			const slug = await uniqueSlug('categories', name);
			await env.DB.prepare('INSERT INTO categories (id, slug, name, description) VALUES (?, ?, ?, ?)')
				.bind(crypto.randomUUID(), slug, name, description).run();
		} catch {
			return redirectTo(request, '/admin/categories/?error=save');
		}
	}
	return redirectTo(request, '/admin/categories/?saved=1');
};

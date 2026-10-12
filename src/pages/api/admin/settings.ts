import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail, bodyIsTooLarge, hasSameOrigin } from '../../../lib/admin-auth';
import { formText, isFormRequest, redirectTo } from '../../../lib/admin-actions';
import { validateEmail } from '../../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!hasSameOrigin(request)) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!(await getAdminEmail(request))) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!isFormRequest(request) || bodyIsTooLarge(request, 12_000)) return new Response('Invalid request', { status: 400, headers: { 'Cache-Control': 'no-store' } });
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return redirectTo(request, '/admin/settings/?error=invalid');
	}
	const values = {
		business_name: formText(form, 'business_name', 120),
		address: formText(form, 'address', 240),
		phone: formText(form, 'phone', 50),
		email: formText(form, 'email', 254).toLowerCase(),
		announcement: formText(form, 'announcement', 180),
		about: formText(form, 'about', 1200),
	};
	if (values.business_name.length < 2 || !values.about || (values.email && !validateEmail(values.email))) {
		return redirectTo(request, '/admin/settings/?error=invalid');
	}
	try {
		const statements = Object.entries(values).map(([key, value]) => env.DB.prepare(
			`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
		).bind(key, value));
		await env.DB.batch(statements);
		return redirectTo(request, '/admin/settings/?saved=1');
	} catch {
		return redirectTo(request, '/admin/settings/?error=save');
	}
};

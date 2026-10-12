import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAdminEmail, bodyIsTooLarge, hasSameOrigin } from '../../../../lib/admin-auth';
import { formText, isFormRequest, redirectTo } from '../../../../lib/admin-actions';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
	if (!hasSameOrigin(request)) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!(await getAdminEmail(request))) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	if (!isFormRequest(request) || bodyIsTooLarge(request, 2_000)) return new Response('Invalid request', { status: 400, headers: { 'Cache-Control': 'no-store' } });
	const id = params.id ?? '';
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return redirectTo(request, '/admin/enquiries/?error=invalid');
	}
	if (formText(form, 'intent', 16) === 'delete') {
		try {
			await env.DB.prepare('DELETE FROM enquiries WHERE id = ?').bind(id).run();
		} catch {
			return redirectTo(request, '/admin/enquiries/?error=save');
		}
	} else {
		const status = formText(form, 'status', 16);
		if (!['new', 'contacted', 'closed'].includes(status)) return redirectTo(request, '/admin/enquiries/?error=invalid');
		try {
			await env.DB.prepare('UPDATE enquiries SET status = ? WHERE id = ?').bind(status, id).run();
		} catch {
			return redirectTo(request, '/admin/enquiries/?error=save');
		}
	}
	return redirectTo(request, '/admin/enquiries/?saved=1');
};

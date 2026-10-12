import { env } from 'cloudflare:workers';
import type { D1Database } from './runtime';
import { uniqueSlugCandidate } from './validation';

export function redirectTo(request: Request, path: string): Response {
	return Response.redirect(new URL(path, request.url), 303);
}

export function isFormRequest(request: Request): boolean {
	const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
	return contentType.startsWith('application/x-www-form-urlencoded') || contentType.startsWith('multipart/form-data');
}

export async function uniqueSlug(
	table: 'products' | 'categories',
	name: string,
	excludeId?: string,
	db: D1Database = env.DB,
): Promise<string> {
	for (let attempt = 0; attempt < 1000; attempt += 1) {
		const candidate = uniqueSlugCandidate(name, attempt, table === 'products' ? 'machine' : 'category');
		const query = excludeId
			? `SELECT id FROM ${table} WHERE slug = ? AND id <> ? LIMIT 1`
			: `SELECT id FROM ${table} WHERE slug = ? LIMIT 1`;
		const used = await db.prepare(query).bind(...(excludeId ? [candidate, excludeId] : [candidate])).first<{ id: string }>();
		if (!used) return candidate;
	}
	return `${uniqueSlugCandidate(name, 0, table === 'products' ? 'machine' : 'category').slice(0, 72)}-${crypto.randomUUID().slice(0, 8)}`;
}

export function formText(form: FormData, key: string, maximum: number): string {
	return String(form.get(key) ?? '').trim().slice(0, maximum);
}


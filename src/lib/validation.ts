import type { PriceMode } from './models';

export interface ProductInput {
	name: string;
	categoryId: string;
	shortDescription: string;
	description: string;
	priceMode: PriceMode;
	priceAmount: number | null;
	featured: boolean;
	status: 'draft' | 'published' | 'archived';
	demo: boolean;
	specifications: Record<string, string>;
	seoTitle: string;
	seoDescription: string;
}

export function slugify(input: string): string {
	return input.normalize('NFKD').toLowerCase().trim()
		.replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

export function uniqueSlugCandidate(name: string, attempt: number, fallback = 'machine'): string {
	const base = slugify(name) || fallback;
	const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
	return `${base.slice(0, 90 - suffix.length)}${suffix}`;
}

export function isAdminEmailAllowed(email: string, allowlist: string[]): boolean {
	const normalized = email.trim().toLowerCase();
	return normalized.length > 0 && allowlist.some((item) => item.trim().toLowerCase() === normalized);
}

export function parseCatalogQuery(search: URLSearchParams): { query: string; category: string; sort: 'newest' | 'name' | 'featured'; page: number } {
	const query = (search.get('q') ?? '').trim().slice(0, 80);
	const category = (search.get('category') ?? '').trim().slice(0, 90);
	const rawPage = Number(search.get('page') ?? '1');
	const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
	const rawSort = search.get('sort');
	const sort = rawSort === 'name' || rawSort === 'featured' ? rawSort : 'newest';
	return { query, category, sort, page };
}

export function validateProductInput(form: FormData): ProductInput {
	const name = String(form.get('name') ?? '').trim();
	const categoryId = String(form.get('category_id') ?? '').trim();
	const shortDescription = String(form.get('short_description') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const rawMode = String(form.get('price_mode') ?? 'quote');
	if (name.length < 2 || name.length > 120) throw new Error('Enter a product name between 2 and 120 characters.');
	if (!/^[a-z0-9][a-z0-9_-]{2,63}$/i.test(categoryId)) throw new Error('Choose a valid category.');
	if (shortDescription.length > 240 || description.length > 8000) throw new Error('Product text is longer than allowed.');
	if (rawMode !== 'quote' && rawMode !== 'fixed' && rawMode !== 'from') throw new Error('Choose a valid pricing option.');
	const rawAmount = String(form.get('price_amount') ?? '').trim();
	const priceAmount = rawAmount ? Number(rawAmount) : null;
	if ((rawMode === 'fixed' || rawMode === 'from') && (!Number.isSafeInteger(priceAmount) || (priceAmount ?? 0) < 0)) {
		throw new Error('Enter a whole-number price, or choose quote only.');
	}
	if (rawMode === 'quote' && rawAmount) throw new Error('Quote-only products must not include an amount.');
	const rawSpecs = String(form.get('specifications') ?? '').trim();
	let specifications: Record<string, string> = {};
	if (rawSpecs) {
		try {
			const parsed = JSON.parse(rawSpecs) as unknown;
			if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
			const entries = Object.entries(parsed as Record<string, unknown>);
			if (entries.length > 24 || entries.some(([key, value]) => key.trim().length > 60 || typeof value !== 'string' || value.length > 200)) throw new Error();
			specifications = Object.fromEntries(entries.map(([key, value]) => [key.trim(), (value as string).trim()]));
		} catch {
			throw new Error('Specifications must be a JSON object with up to 24 short text values.');
		}
	}
	return {
		name, categoryId, shortDescription, description, priceMode: rawMode,
		priceAmount: rawMode === 'quote' ? null : priceAmount,
		featured: form.get('is_featured') === 'on',
		status: form.get('status') === 'published' || form.get('status') === 'archived' ? form.get('status') as 'published' | 'archived' : 'draft',
		demo: form.get('is_demo') === 'on', specifications,
		seoTitle: String(form.get('seo_title') ?? '').trim().slice(0, 70),
		seoDescription: String(form.get('seo_description') ?? '').trim().slice(0, 160),
	};
}

export function validateEmail(value: string): boolean {
	return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function detectImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
	if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
	if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
	return null;
}

export function validateCategoryName(value: string): string {
	const name = value.trim();
	if (name.length < 2 || name.length > 80) throw new Error('Enter a category name between 2 and 80 characters.');
	if (!slugify(name)) throw new Error('The category name must include a letter or number.');
	return name;
}


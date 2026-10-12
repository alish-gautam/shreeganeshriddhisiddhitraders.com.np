import assert from 'node:assert/strict';
import test from 'node:test';
import type { Product } from '../src/lib/models.ts';
import {
	detectImageMime, isAdminEmailAllowed, parseCatalogQuery, slugify,
	uniqueSlugCandidate, validateCategoryName, validateEmail, validateProductInput,
} from '../src/lib/validation.ts';
import { canonicalPath, productMeta, sitemapProductPaths } from '../src/lib/seo-core.ts';

test('slug generation normalizes text and unique suffixes', () => {
	assert.equal(slugify('Café machine — 2'), 'cafe-machine-2');
	assert.equal(uniqueSlugCandidate('Sample Machine', 0), 'sample-machine');
	assert.equal(uniqueSlugCandidate('Sample Machine', 1), 'sample-machine-2');
	assert.equal(uniqueSlugCandidate('***', 0, 'category'), 'category');
});

test('catalog query values are bounded and allow only known sorting modes', () => {
	const query = parseCatalogQuery(new URLSearchParams('q=%20pulp%20&category=food&page=4&sort=name'));
	assert.deepEqual(query, { query: 'pulp', category: 'food', page: 4, sort: 'name' });
	assert.equal(parseCatalogQuery(new URLSearchParams('page=-1&sort=price')).page, 1);
	assert.equal(parseCatalogQuery(new URLSearchParams('sort=price')).sort, 'newest');
	assert.equal(parseCatalogQuery(new URLSearchParams(`q=${'x'.repeat(100)}`)).query.length, 80);
});

test('product validation accepts quote pricing and rejects inconsistent amounts', () => {
	const quote = new FormData();
	quote.set('name', 'Sample Machine'); quote.set('category_id', 'demo-category-machinery');
	quote.set('price_mode', 'quote'); quote.set('specifications', '{"Material":"Steel"}');
	assert.equal(validateProductInput(quote).priceAmount, null);
	assert.deepEqual(validateProductInput(quote).specifications, { Material: 'Steel' });

	const fixed = new FormData();
	fixed.set('name', 'Fixed Machine'); fixed.set('category_id', 'demo-category-machinery');
	fixed.set('price_mode', 'fixed'); fixed.set('price_amount', '250000');
	assert.equal(validateProductInput(fixed).priceAmount, 250000);
	fixed.set('status', 'archived');
	assert.equal(validateProductInput(fixed).status, 'archived');
	fixed.set('price_amount', '-1');
	assert.throws(() => validateProductInput(fixed), /whole-number price/);
	quote.set('price_amount', '100');
	assert.throws(() => validateProductInput(quote), /Quote-only/);
});

test('specification, category and contact fields reject malformed values', () => {
	assert.equal(validateCategoryName('Food Machinery'), 'Food Machinery');
	assert.throws(() => validateCategoryName('!!!'), /letter or number/);
	assert.equal(validateEmail('owner@example.com'), true);
	assert.equal(validateEmail('no-at-sign'), false);
	assert.equal(isAdminEmailAllowed('OWNER@example.com', ['owner@example.com']), true);
	assert.equal(isAdminEmailAllowed('other@example.com', ['owner@example.com']), false);

	const form = new FormData();
	form.set('name', 'Machine'); form.set('category_id', 'demo-category-machinery');
	form.set('specifications', '["not", "an object"]');
	assert.throws(() => validateProductInput(form), /JSON object/);
});

test('image validation uses file signatures and excludes SVG or unknown payloads', () => {
	assert.equal(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
	assert.equal(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
	const webp = new Uint8Array(12); webp.set([0x52,0x49,0x46,0x46],0); webp.set([0x57,0x45,0x42,0x50],8);
	assert.equal(detectImageMime(webp), 'image/webp');
	assert.equal(detectImageMime(new TextEncoder().encode('<svg></svg>')), null);
});

test('canonical paths and SEO metadata have stable forms', () => {
	assert.equal(canonicalPath('/machines/sample-machine'), '/machines/sample-machine/');
	assert.equal(canonicalPath('/'), '/');
	const meta = productMeta({ name: 'Machine', short_description: 'A confirmed description', description: '', seo_title: '', seo_description: '' }, 'SGRS Traders');
	assert.equal(meta.title, 'Machine | SGRS Traders');
	assert.equal(meta.description, 'A confirmed description');
	assert.equal(productMeta({ name: 'Machine', short_description: '', description: '', seo_title: '', seo_description: '' }, 'SGRS').description.startsWith('Information about Machine'), true);
});

test('sitemap path selection excludes drafts, demo records, and all demo-mode product URLs', () => {
	const base = { id: '1', category_id: 'c', category_name: 'Tools', category_slug: 'tools', short_description: '', description: '', price_mode: 'quote', price_amount: null, price_currency: 'NPR', is_featured: 0, specifications: {}, seo_title: '', seo_description: '', created_at: '', updated_at: '', images: [] } as const;
	const items = [
		{ ...base, slug: 'published', status: 'published', is_demo: 0 },
		{ ...base, slug: 'draft', status: 'draft', is_demo: 0 },
		{ ...base, slug: 'sample', status: 'published', is_demo: 1 },
	] as unknown as Product[];
	assert.deepEqual(sitemapProductPaths(items, false), ['/machines/published/']);
	assert.deepEqual(sitemapProductPaths(items, true), []);
});

import { env } from 'cloudflare:workers';
import type { Category, Enquiry, Product } from './models';
import type { D1Database } from './runtime';
import { DEMO_MODE } from './site';

const PRODUCT_FIELDS = `p.id, p.slug, p.name, p.category_id, c.name AS category_name,
 c.slug AS category_slug, p.short_description, p.description, p.price_mode,
 p.price_amount, p.price_currency, p.is_featured,
 CASE WHEN p.is_archived = 1 THEN 'archived' ELSE p.status END AS status, p.is_demo,
 p.specifications_json, p.seo_title, p.seo_description, p.created_at, p.updated_at`;

interface ProductRow extends Omit<Product, 'specifications' | 'images'> {
	specifications_json: string;
}

function parseProduct(row: ProductRow, images: Product['images'] = []): Product {
	let specifications: Record<string, string> = {};
	try {
		specifications = JSON.parse(row.specifications_json) as Record<string, string>;
	} catch {
		specifications = {};
	}
	return { ...row, specifications, images };
}

function publicFilter(): string {
	return DEMO_MODE
		? "p.status = 'published' AND p.is_archived = 0"
		: "p.status = 'published' AND p.is_archived = 0 AND p.is_demo = 0";
}

async function attachImages(db: D1Database, rows: ProductRow[]): Promise<Product[]> {
	if (rows.length === 0) return [];
	const placeholders = rows.map(() => '?').join(', ');
	const imageRows = await db.prepare(
		`SELECT id, product_id, r2_key AS key, alt_text, width, height, position, is_primary
		 FROM product_images WHERE product_id IN (${placeholders}) ORDER BY is_primary DESC, position ASC`,
	).bind(...rows.map((row) => row.id)).all<Product['images'][number] & { product_id: string }>();
	const imageMap = new Map<string, Product['images']>();
	for (const image of imageRows.results) {
		const images = imageMap.get(image.product_id) ?? [];
		images.push(image);
		imageMap.set(image.product_id, images);
	}
	return rows.map((row) => parseProduct(row, imageMap.get(row.id) ?? []));
}

export async function listCategories(db: D1Database = env.DB, includeEmpty = false): Promise<Category[]> {
	const having = includeEmpty ? '' : 'HAVING COUNT(p.id) > 0';
	const result = await db.prepare(
		`SELECT c.id, c.slug, c.name, c.description, COUNT(p.id) AS product_count
		 FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.status = 'published' AND p.is_archived = 0
		 ${DEMO_MODE ? '' : 'AND p.is_demo = 0'}
		 GROUP BY c.id, c.slug, c.name, c.description ${having}
		 ORDER BY c.position ASC, c.name COLLATE NOCASE ASC`,
	).all<Category>();
	return result.results;
}

export async function getCategory(slug: string, db: D1Database = env.DB): Promise<Category | null> {
	const category = await db.prepare('SELECT id, slug, name, description FROM categories WHERE slug = ? LIMIT 1')
		.bind(slug).first<Category>();
	return category;
}

export interface CatalogOptions {
	query?: string;
	category?: string;
	sort: 'newest' | 'name' | 'featured';
	page: number;
	pageSize?: number;
}

export interface CatalogResult {
	items: Product[];
	count: number;
	page: number;
	pageSize: number;
}

export async function listProducts(options: CatalogOptions, db: D1Database = env.DB): Promise<CatalogResult> {
	const pageSize = options.pageSize ?? 12;
	const conditions = [publicFilter()];
	const values: (string | number)[] = [];
	if (options.category) {
		conditions.push('c.slug = ?');
		values.push(options.category);
	}
	if (options.query) {
		conditions.push(`(p.name LIKE ? ESCAPE '\\' OR p.short_description LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')`);
		const needle = `%${options.query.replace(/[\\%_]/g, '\\$&')}%`;
		values.push(needle, needle, needle, needle);
	}
	const where = conditions.join(' AND ');
	const count = await db.prepare(`SELECT COUNT(*) AS count FROM products p JOIN categories c ON c.id = p.category_id WHERE ${where}`)
		.bind(...values).first<{ count: number }>();
	const order = options.sort === 'name' ? 'p.name COLLATE NOCASE ASC' : options.sort === 'featured' ? 'p.is_featured DESC, p.created_at DESC' : 'p.created_at DESC';
	const offset = (options.page - 1) * pageSize;
	const rows = await db.prepare(
		`SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id
		 WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
	).bind(...values, pageSize, offset).all<ProductRow>();
	return { items: await attachImages(db, rows.results), count: count?.count ?? 0, page: options.page, pageSize };
}

export async function getFeaturedProducts(limit = 4, db: D1Database = env.DB): Promise<Product[]> {
	const rows = await db.prepare(
		`SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id
		 WHERE ${publicFilter()} AND p.is_featured = 1 ORDER BY p.created_at DESC LIMIT ?`,
	).bind(limit).all<ProductRow>();
	return attachImages(db, rows.results);
}

export async function getProductBySlug(slug: string, db: D1Database = env.DB): Promise<Product | null> {
	const row = await db.prepare(
		`SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id
		 WHERE ${publicFilter()} AND p.slug = ? LIMIT 1`,
	).bind(slug).first<ProductRow>();
	if (!row) return null;
	return (await attachImages(db, [row]))[0] ?? null;
}

export async function getProductById(id: string, db: D1Database = env.DB): Promise<Product | null> {
	const row = await db.prepare(
		`SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ? LIMIT 1`,
	).bind(id).first<ProductRow>();
	if (!row) return null;
	return (await attachImages(db, [row]))[0] ?? null;
}

export async function getPublishedProductById(id: string, db: D1Database = env.DB): Promise<Product | null> {
	const row = await db.prepare(
		`SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id
		 WHERE ${publicFilter()} AND p.id = ? LIMIT 1`,
	).bind(id).first<ProductRow>();
	if (!row) return null;
	return (await attachImages(db, [row]))[0] ?? null;
}

export async function listAdminProducts(db: D1Database = env.DB): Promise<Product[]> {
	const rows = await db.prepare(
		`SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.updated_at DESC LIMIT 200`,
	).all<ProductRow>();
	return attachImages(db, rows.results);
}

export async function listEnquiries(db: D1Database = env.DB): Promise<Enquiry[]> {
	const result = await db.prepare(
		`SELECT e.id, e.name, e.email, e.phone, e.message, e.status, e.created_at, p.name AS product_name
		 FROM enquiries e LEFT JOIN products p ON p.id = e.product_id ORDER BY e.created_at DESC LIMIT 200`,
	).all<Enquiry>();
	return result.results;
}


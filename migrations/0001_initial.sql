PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY NOT NULL,
	value TEXT NOT NULL,
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
	id TEXT PRIMARY KEY NOT NULL,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	position INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
	id TEXT PRIMARY KEY NOT NULL,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	category_id TEXT NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
	short_description TEXT NOT NULL DEFAULT '',
	description TEXT NOT NULL DEFAULT '',
	price_mode TEXT NOT NULL DEFAULT 'quote' CHECK (price_mode IN ('quote', 'fixed', 'from')),
	price_amount INTEGER,
	price_currency TEXT NOT NULL DEFAULT 'NPR',
	is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
	status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
	is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
	specifications_json TEXT NOT NULL DEFAULT '{}',
	seo_title TEXT NOT NULL DEFAULT '',
	seo_description TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	CHECK ((price_mode = 'quote' AND price_amount IS NULL) OR (price_mode IN ('fixed', 'from') AND price_amount >= 0))
);

CREATE TABLE IF NOT EXISTS product_images (
	id TEXT PRIMARY KEY NOT NULL,
	product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	r2_key TEXT NOT NULL UNIQUE,
	alt_text TEXT NOT NULL DEFAULT '',
	mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
	width INTEGER,
	height INTEGER,
	position INTEGER NOT NULL DEFAULT 0,
	is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enquiries (
	id TEXT PRIMARY KEY NOT NULL,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	phone TEXT NOT NULL DEFAULT '',
	message TEXT NOT NULL,
	product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
	status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS products_public_category_created ON products(status, category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS products_public_featured ON products(status, is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS product_images_product_position ON product_images(product_id, is_primary DESC, position ASC);
CREATE INDEX IF NOT EXISTS enquiries_created_status ON enquiries(created_at DESC, status);

INSERT OR IGNORE INTO settings (key, value) VALUES
	('business_name', 'Shree Ganesh Riddhi Siddhi Traders'),
	('address', 'Basukinath Marg, near Bargachhi, Biratnagar, Koshi Province, Nepal 56613'),
	('phone', ''), ('email', ''), ('announcement', ''),
	('about', 'A machinery trading business based in Biratnagar, Nepal. Browse the catalogue and contact the business to discuss product details, availability, and pricing.');

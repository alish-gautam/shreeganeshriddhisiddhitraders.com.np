INSERT OR IGNORE INTO categories (id, slug, name, description, position)
VALUES ('demo-category-machinery', 'demo-machinery', 'Demonstration machinery', 'Sample category for the client preview. Replace this category with verified product groups.', 0);

INSERT OR IGNORE INTO products (id, slug, name, category_id, short_description, description, price_mode, is_featured, status, is_demo, specifications_json, seo_title, seo_description)
VALUES
	('demo-machine-01', 'sample-machine-one', 'Sample Machine One', 'demo-category-machinery', 'Demonstration record — replace with confirmed product information.', 'This sample product exists only to demonstrate catalogue browsing and product editing. Confirm all product details directly with the business before publication.', 'quote', 1, 'published', 1, '{}', '', ''),
	('demo-machine-02', 'sample-machine-two', 'Sample Machine Two', 'demo-category-machinery', 'Demonstration record — replace with confirmed product information.', 'This sample product exists only to demonstrate catalogue browsing and product editing. Confirm all product details directly with the business before publication.', 'quote', 1, 'published', 1, '{}', '', '');

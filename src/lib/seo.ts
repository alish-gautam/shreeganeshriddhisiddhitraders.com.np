import type { Product } from './models';
import { absoluteUrl, DEMO_MODE } from './site';
import { sitemapProductPaths } from './seo-core';
export { canonicalPath } from './seo-core';

export function productStructuredData(product: Product): Record<string, unknown> | undefined {
	if (product.is_demo === 1) return undefined;
	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: product.short_description || product.description,
		...(product.images.length ? { image: product.images.map((image) => absoluteUrl(`/media/${image.key.split('/').map(encodeURIComponent).join('/')}`)) } : {}),
		category: product.category_name,
		...(product.price_mode !== 'quote' && product.price_amount !== null ? {
			offers: {
				'@type': 'Offer', priceCurrency: product.price_currency,
				price: product.price_amount, url: absoluteUrl(`/machines/${product.slug}/`),
			},
		} : {}),
	};
}

export function sitemapProductUrls(products: Product[]): string[] {
	return sitemapProductPaths(products, DEMO_MODE).map(absoluteUrl);
}


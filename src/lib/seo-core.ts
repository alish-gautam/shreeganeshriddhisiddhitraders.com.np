import type { Product } from './models';

export function canonicalPath(pathname: string): string {
	const normalized = `/${pathname.split('/').filter(Boolean).join('/')}/`;
	return normalized === '//' ? '/' : normalized;
}

export function productMeta(product: Pick<Product, 'name' | 'short_description' | 'description' | 'seo_title' | 'seo_description'>, businessName: string) {
	const description = product.seo_description || product.short_description || product.description || `Information about ${product.name} from ${businessName}. Contact the business to confirm details and pricing.`;
	return {
		title: product.seo_title || `${product.name} | ${businessName}`,
		description: description.slice(0, 160),
	};
}

export function sitemapProductPaths(products: Product[], demoMode: boolean): string[] {
	if (demoMode) return [];
	return products.filter((product) => product.status === 'published' && product.is_demo === 0)
		.map((product) => `/machines/${product.slug}/`);
}

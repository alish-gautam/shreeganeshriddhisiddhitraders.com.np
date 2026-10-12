import type { APIRoute } from 'astro';
import { listCategories, listProducts } from '../lib/db';
import { absoluteUrl, DEMO_MODE } from '../lib/site';
import { sitemapProductUrls } from '../lib/seo';

export const prerender = false;

export const GET: APIRoute = async () => {
	if (DEMO_MODE) {
		return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' } });
	}
	try {
		const [categories, firstPage] = await Promise.all([listCategories(), listProducts({ sort: 'newest', page: 1, pageSize: 50 })]);
		const products = [...firstPage.items];
		const pages = Math.ceil(firstPage.count / firstPage.pageSize);
		for (let page = 2; page <= pages; page += 1) {
			const result = await listProducts({ sort: 'newest', page, pageSize: 50 });
			products.push(...result.items);
		}
		const staticPaths = ['/', '/machines/', '/about/', '/services/', '/guides/', '/guides/compare-machinery/', '/contact/', '/privacy/', '/terms/'];
		const urls = [...staticPaths.map(absoluteUrl), ...categories.map((category) => absoluteUrl(`/categories/${category.slug}/`)), ...sitemapProductUrls(products)];
		const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url.replaceAll('&', '&amp;')}</loc></url>`).join('')}</urlset>`;
		return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' } });
	} catch {
		return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
	}
};

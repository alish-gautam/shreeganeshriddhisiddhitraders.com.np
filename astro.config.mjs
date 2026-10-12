// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	site: 'https://shreeganeshriddhisiddhitraders.com.np',
	output: 'server',
	trailingSlash: 'always',
	adapter: cloudflare({ imageService: 'passthrough' }),
	session: false,
	vite: { plugins: [tailwindcss()] },
});

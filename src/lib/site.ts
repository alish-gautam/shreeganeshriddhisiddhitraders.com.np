import { env } from 'cloudflare:workers';
import type { D1Database } from './runtime';

export interface SiteSettings {
	businessName: string;
	address: string;
	phone: string;
	email: string;
	announcement: string;
	about: string;
}

export const SITE_URL = new URL(import.meta.env.SITE ?? 'https://shreeganeshriddhisiddhitraders.com.np');
export const DEMO_MODE = import.meta.env.PUBLIC_DEMO_MODE !== 'false';

export const defaultSettings: SiteSettings = {
	businessName: 'Shree Ganesh Riddhi Siddhi Traders',
	address: 'Basukinath Marg, near Bargachhi, Biratnagar, Koshi Province, Nepal 56613',
	phone: '',
	email: '',
	announcement: '',
	about: 'A machinery trading business based in Biratnagar, Nepal. Browse the catalogue and contact the business to discuss product details, availability, and pricing.',
};

const settingKeys: Record<keyof SiteSettings, string> = {
	businessName: 'business_name',
	address: 'address',
	phone: 'phone',
	email: 'email',
	announcement: 'announcement',
	about: 'about',
};

export async function getSiteSettings(db: D1Database = env.DB): Promise<SiteSettings> {
	const rows = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
	const values = new Map(rows.results.map((row) => [row.key, row.value]));
	return Object.fromEntries(
		Object.entries(settingKeys).map(([property, key]) => [property, values.get(key) ?? defaultSettings[property as keyof SiteSettings]]),
	) as unknown as SiteSettings;
}

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_URL).toString();
}


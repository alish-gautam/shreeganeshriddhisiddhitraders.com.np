declare global {
	namespace Cloudflare {
		interface Env {
			ACCESS_TEAM_DOMAIN?: string;
			ACCESS_AUD?: string;
			ADMIN_EMAILS?: string;
		}
	}
}

export type D1Database = Cloudflare.Env['DB'];
export type R2Bucket = Cloudflare.Env['PRODUCT_IMAGES'];

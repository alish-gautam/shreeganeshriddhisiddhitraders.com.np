import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from 'cloudflare:workers';
import { isAdminEmailAllowed } from './validation';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function accessIssuer(domain: string | undefined): URL | null {
	if (!domain) return null;
	try {
		const url = new URL(domain.startsWith('https://') ? domain : `https://${domain}`);
		if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
		return url;
	} catch {
		return null;
	}
}

export async function getAdminEmail(request: Request): Promise<string | null> {
	const issuerUrl = accessIssuer(env.ACCESS_TEAM_DOMAIN);
	const audience = env.ACCESS_AUD?.trim();
	const allowlist = (env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
	const token = request.headers.get('Cf-Access-Jwt-Assertion');
	if (!issuerUrl || !audience || allowlist.length === 0 || !token) return null;
	const issuer = issuerUrl.origin;
	let jwks = keySets.get(issuer);
	if (!jwks) {
		jwks = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuerUrl));
		keySets.set(issuer, jwks);
	}
	try {
		const { payload } = await jwtVerify(token, jwks, {
			issuer,
			audience,
			clockTolerance: 5,
			requiredClaims: ['exp', 'iat', 'sub', 'email'],
		});
		const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
		return typeof payload.sub === 'string' && payload.sub.length > 0 && isAdminEmailAllowed(email, allowlist) ? email : null;
	} catch {
		return null;
	}
}

export function hasSameOrigin(request: Request): boolean {
	const origin = request.headers.get('Origin');
	if (!origin) return false;
	try {
		return new URL(origin).origin === new URL(request.url).origin;
	} catch {
		return false;
	}
}

export function bodyIsTooLarge(request: Request, limit: number): boolean {
	const length = Number(request.headers.get('content-length') ?? '0');
	return Number.isFinite(length) && length > limit;
}


import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const result = spawnSync(process.execPath, [astroCli, 'build'], {
	stdio: 'inherit',
	env: { ...process.env, PUBLIC_DEMO_MODE: 'false', CLOUDFLARE_ENV: 'production' },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

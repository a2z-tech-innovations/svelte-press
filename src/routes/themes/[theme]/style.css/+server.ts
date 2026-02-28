import { readFileSync } from 'fs';
import { join } from 'path';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = ({ params }) => {
	// Sanitize slug to prevent path traversal
	const slug = params.theme.replace(/[^a-z0-9-]/g, '');
	try {
		const css = readFileSync(join(process.cwd(), 'themes', slug, 'style.css'), 'utf-8');
		return new Response(css, {
			headers: {
				'Content-Type': 'text/css',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch {
		throw error(404, 'Theme not found');
	}
};

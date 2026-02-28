import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

// oEmbed provider endpoints
const PROVIDERS: Array<{ regex: RegExp; endpoint: string }> = [
	{
		regex: /youtube\.com\/watch|youtu\.be\//,
		endpoint: 'https://www.youtube.com/oembed'
	},
	{
		regex: /vimeo\.com\//,
		endpoint: 'https://vimeo.com/api/oembed.json'
	},
	{
		regex: /twitter\.com\/|x\.com\//,
		endpoint: 'https://publish.twitter.com/oembed'
	},
	{
		regex: /soundcloud\.com\//,
		endpoint: 'https://soundcloud.com/oembed'
	},
	{
		regex: /spotify\.com\//,
		endpoint: 'https://open.spotify.com/oembed'
	},
	{
		regex: /instagram\.com\//,
		endpoint: 'https://graph.facebook.com/v18.0/instagram_oembed'
	},
	{
		regex: /tiktok\.com\//,
		endpoint: 'https://www.tiktok.com/oembed'
	}
];

export const GET: RequestHandler = async ({ url }) => {
	const embedUrl = url.searchParams.get('url');
	if (!embedUrl) {
		return json({ error: 'Missing url parameter' }, { status: 400 });
	}

	// Find matching provider
	const provider = PROVIDERS.find((p) => p.regex.test(embedUrl));
	if (!provider) {
		return json({ error: 'No oEmbed provider found for this URL' }, { status: 422 });
	}

	try {
		const oembedUrl = new URL(provider.endpoint);
		oembedUrl.searchParams.set('url', embedUrl);
		oembedUrl.searchParams.set('format', 'json');
		oembedUrl.searchParams.set('maxwidth', '800');

		const response = await fetch(oembedUrl.toString(), {
			headers: { 'User-Agent': 'SveltePress/1.0 oEmbed' },
			signal: AbortSignal.timeout(5000)
		});

		if (!response.ok) {
			return json({ error: `Provider returned ${response.status}` }, { status: 502 });
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ error: `Failed to fetch oEmbed data: ${message}` }, { status: 502 });
	}
};

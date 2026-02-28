export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function truncate(text: string, length: number): string {
	if (text.length <= length) return text;
	return text.slice(0, length).trimEnd() + '…';
}

export function formatDate(date: Date | null | undefined, fmt = 'MMM d, yyyy'): string {
	if (!date) return '—';
	const d = date instanceof Date ? date : new Date(date);
	if (isNaN(d.getTime())) return '—';

	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June',
	                    'July', 'August', 'September', 'October', 'November', 'December'];

	const pad = (n: number) => String(n).padStart(2, '0');

	return fmt
		.replace('MMMM', fullMonths[d.getMonth()])
		.replace('MMM', months[d.getMonth()])
		.replace('MM', pad(d.getMonth() + 1))
		.replace('yyyy', String(d.getFullYear()))
		.replace('yy', String(d.getFullYear()).slice(-2))
		.replace('dd', pad(d.getDate()))
		.replace('d', String(d.getDate()))
		.replace('HH', pad(d.getHours()))
		.replace('mm', pad(d.getMinutes()));
}

export function timeAgo(date: Date | null | undefined): string {
	if (!date) return '';
	const d = date instanceof Date ? date : new Date(date);
	const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return formatDate(d);
}

export async function gravatarUrl(email: string, size = 48): Promise<string> {
	const encoded = new TextEncoder().encode(email.trim().toLowerCase());
	const buf = await crypto.subtle.digest('SHA-256', encoded);
	const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

export function gravatarUrlSync(email: string, size = 48): string {
	// Fallback for contexts where async isn't available — returns default avatar
	return `https://www.gravatar.com/avatar/?s=${size}&d=mp`;
}

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0] ?? '')
		.join('')
		.toUpperCase();
}

export function bytesToHuman(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMediaUrl(path: string): string {
	// path stored relative to static/ dir
	return '/' + path.replace(/^\.?\/?static\//, '').replace(/^\//, '');
}

/**
 * Generate a permalink URL for a post based on the active permalink structure.
 *
 * Structures map:
 *   ''                                   → plain: /?p={id}
 *   '/%year%/%monthnum%/%day%/%postname%/' → day-name: /2026/02/28/post-slug/
 *   '/%year%/%monthnum%/%postname%/'      → month-name: /2026/02/post-slug/
 *   '/archives/%post_id%'                → numeric: /archives/123
 *   '/%postname%/'                       → post-name (default): /post-slug/
 *   anything else with %postname%        → custom, replace tokens
 */
export function getPermalinkUrl(
	post: { id: number; slug: string; postDate: Date | string | null | undefined },
	structure: string,
	_customBase?: string
): string {
	const date = post.postDate ? new Date(post.postDate) : new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	// Known preset structures
	if (!structure || structure === '') {
		return `/?p=${post.id}`;
	}
	if (structure === '/%year%/%monthnum%/%day%/%postname%/') {
		return `/${year}/${month}/${day}/${post.slug}/`;
	}
	if (structure === '/%year%/%monthnum%/%postname%/') {
		return `/${year}/${month}/${post.slug}/`;
	}
	if (structure === '/archives/%post_id%') {
		return `/archives/${post.id}`;
	}
	if (structure === '/%postname%/') {
		return `/${post.slug}/`;
	}

	// Custom structure — replace all known tokens
	const result = structure
		.replace('%year%', String(year))
		.replace('%monthnum%', month)
		.replace('%day%', day)
		.replace('%post_id%', String(post.id))
		.replace('%postname%', post.slug)
		.replace('%author%', post.slug) // fallback; real author slug not available here
		.replace('%category%', ''); // fallback; category not available here

	// Ensure the result starts with a slash
	return result.startsWith('/') ? result : `/${result}`;
}

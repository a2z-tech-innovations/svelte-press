interface Bucket {
	count: number;
	resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitRule {
	max: number;
	windowMs: number;
}

export function checkRateLimit(
	key: string,
	rule: RateLimitRule
): { limited: boolean; retryAfterSecs: number } {
	const now = Date.now();
	let bucket = store.get(key);
	if (!bucket || now > bucket.resetAt) {
		bucket = { count: 0, resetAt: now + rule.windowMs };
		store.set(key, bucket);
	}
	bucket.count++;
	if (bucket.count > rule.max) {
		return { limited: true, retryAfterSecs: Math.ceil((bucket.resetAt - now) / 1000) };
	}
	return { limited: false, retryAfterSecs: 0 };
}

// Cleanup expired buckets every 10 minutes to prevent memory growth
setInterval(() => {
	const now = Date.now();
	for (const [key, bucket] of store) {
		if (now > bucket.resetAt) store.delete(key);
	}
}, 10 * 60 * 1000).unref();

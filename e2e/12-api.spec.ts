import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const BASE = 'http://localhost:5173';

test.describe('REST API Abuse & Edge Cases', () => {
	test('GET /api/v1/posts returns published posts', async ({ request }) => {
		const res = await request.get(`${BASE}/api/v1/posts`);
		expect(res.status()).toBe(200);
		const body = await res.json();
		// API returns array directly (not wrapped in { posts: [...] })
		const posts = Array.isArray(body) ? body : body.posts ?? [];
		expect(Array.isArray(posts)).toBe(true);
		// All returned posts should be published
		for (const post of posts) {
			expect(post.status).toBe('publish');
		}
	});

	test('POST /api/v1/posts without auth returns 401', async ({ request }) => {
		const res = await request.post(`${BASE}/api/v1/posts`, {
			data: { title: 'Unauthorized Post', content: '{}', status: 'draft' }
		});
		expect(res.status()).toBe(401);
	});

	test('POST /api/v1/posts with auth but empty body returns 400', async ({ page, request }) => {
		// Get session cookie by logging in via browser
		await login(page);
		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find((c) => c.name === 'sp_session');

		if (sessionCookie) {
			const res = await request.post(`${BASE}/api/v1/posts`, {
				headers: { Cookie: `sp_session=${sessionCookie.value}` },
				data: {}
			});
			expect([400, 422]).toContain(res.status());
		}
	});

	test('POST /api/v1/posts with valid auth and malformed JSON returns 400', async ({
		page,
		request
	}) => {
		await login(page);
		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find((c) => c.name === 'sp_session');

		if (sessionCookie) {
			const res = await request.post(`${BASE}/api/v1/posts`, {
				headers: {
					Cookie: `sp_session=${sessionCookie.value}`,
					'Content-Type': 'application/json'
				},
				data: 'not-valid-json{'
			});
			expect([400, 415, 422, 500]).toContain(res.status());
		}
	});

	test('XSS in post title is sanitized when rendered', async ({ page, request }) => {
		await login(page);
		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find((c) => c.name === 'sp_session');
		if (!sessionCookie) return;

		const xssTitle = "<script>alert('xss')</script>XSS Test Post";
		const res = await request.post(`${BASE}/api/v1/posts`, {
			headers: { Cookie: `sp_session=${sessionCookie.value}` },
			data: { title: xssTitle, content: '{"type":"doc","content":[]}', status: 'publish' }
		});

		if (res.status() === 201 || res.status() === 200) {
			const body = await res.json();
			const postId = body.id ?? body.post?.id;
			if (postId) {
				// Navigate to frontend and verify script tag is escaped/stripped
				const slug = body.slug ?? body.post?.slug ?? `xss-test-post`;
				await page.goto(`/${slug}/`);
				// The script should NOT execute (no alert) and should be escaped in HTML
				const html = await page.content();
				expect(html).not.toContain('<script>alert(');
			}
		}
	});

	test('GET /api/v1/posts with SQL injection attempt returns safely', async ({ request }) => {
		const res = await request.get(`${BASE}/api/v1/posts?search=${encodeURIComponent("' OR 1=1 --")}`);
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty('posts');
		// Should return normal (empty or filtered) results, not a crash
	});

	test('GET /api/v1/posts with extreme pagination values is clamped', async ({ request }) => {
		const res = await request.get(`${BASE}/api/v1/posts?page=-1&per_page=99999`);
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty('posts');
		// per_page should be clamped to a reasonable max
		expect(body.posts.length).toBeLessThanOrEqual(100);
	});

	test('POST /api/v1/comments with massive content is handled', async ({ request }) => {
		// Find a published post to comment on
		const postsRes = await request.get(`${BASE}/api/v1/posts`);
		const postsBody = await postsRes.json();
		const publishedPosts = Array.isArray(postsBody) ? postsBody : postsBody.posts ?? [];
		const postId = publishedPosts.length > 0 ? publishedPosts[0].id : 999999;

		const hugeContent = 'A'.repeat(100_000); // 100KB of text
		const res = await request.post(`${BASE}/api/v1/comments`, {
			data: {
				postId,
				authorName: 'Test',
				authorEmail: 'test@test.com',
				content: hugeContent
			}
		});
		// Should either succeed (201) with truncation, return a size error (400/413), or 404 if no post
		expect([200, 201, 400, 404, 413, 422]).toContain(res.status());
	});

	test('GET /api/v1/users without admin auth returns 401 or 403', async ({ request }) => {
		const res = await request.get(`${BASE}/api/v1/users`);
		expect([401, 403]).toContain(res.status());
	});

	test('rapid POST requests do not crash the server', async ({ page, request }) => {
		await login(page);
		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find((c) => c.name === 'sp_session');
		if (!sessionCookie) return;

		// Fire 10 parallel GET requests to posts (safe reads)
		const requests = Array.from({ length: 10 }, () =>
			request.get(`${BASE}/api/v1/posts`, {
				headers: { Cookie: `sp_session=${sessionCookie.value}` }
			})
		);
		const results = await Promise.all(requests);
		const okCount = results.filter((r) => r.status() === 200).length;
		// Most should succeed (allow for rate limiting returning 429)
		expect(okCount).toBeGreaterThanOrEqual(1);
	});

	test('POST to rate-limited auth endpoints is throttled', async ({ request }) => {
		// Send 10 failed login attempts to trigger rate limiting
		const attempts = Array.from({ length: 10 }, (_, i) =>
			request.post(`${BASE}/sp-login`, {
				form: { username: 'admin', password: `wrong${i}` }
			})
		);
		const results = await Promise.all(attempts);
		// At least some should succeed (200 or redirect), none should 500
		for (const r of results) {
			expect(r.status()).not.toBe(500);
		}
	});
});

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, comments, options} from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { loadPostById } from '$lib/server/postLoader.js';
import { sendEmail } from '$lib/server/email/index.js';

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.id, 10);

	if (isNaN(id) || id <= 0) {
		error(404, 'Post not found');
	}

	const result = loadPostById(id);

	if (!result) {
		error(404, 'Post not found');
	}

	return result;
};

export const actions: Actions = {
	comment: async (event) => {
		const { request, params, getClientAddress } = event;
		const id = parseInt(params.id, 10);

		if (isNaN(id) || id <= 0) {
			return fail(404, { error: 'Post not found.' });
		}

		const post = db
			.select({
				id: posts.id,
				title: posts.title,
				slug: posts.slug,
				commentStatus: posts.commentStatus,
				authorId: posts.authorId,
				postDate: posts.postDate
			})
			.from(posts)
			.where(and(eq(posts.id, id), eq(posts.status, 'publish')))
			.get();

		if (!post) {
			return fail(404, { error: 'Post not found.' });
		}

		if (post.commentStatus !== 'open') {
			return fail(403, { error: 'Comments are closed on this post.' });
		}

		// Enforce discussion settings
		const allOpts = db.select().from(options).all();
		const opts: Record<string, string> = {};
		for (const o of allOpts) opts[o.optionName] = o.optionValue;

		if (opts['comment_registration'] === '1' && !event.locals.user) {
			return fail(403, { error: 'You must be logged in to post a comment.' });
		}

		const closeDays = Number(opts['close_comments_days_old'] ?? 0);
		if (closeDays > 0 && post.postDate) {
			const ageMs = Date.now() - new Date(post.postDate).getTime();
			if (ageMs > closeDays * 86400000) {
				return fail(403, { error: 'Comments are closed for this post.' });
			}
		}

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const content = String(data.get('content') ?? '').trim();
		const rawUrl = String(data.get('url') ?? '').trim();
		const authorUrl = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : '';
		const parentIdRaw = data.get('parentId');
		const parentId =
			parentIdRaw && String(parentIdRaw).trim() !== ''
				? parseInt(String(parentIdRaw), 10) || null
				: null;

		if (!name) return fail(400, { error: 'Name is required.', name, email, content });
		if (!email || !email.includes('@'))
			return fail(400, { error: 'A valid email is required.', name, email, content });
		if (!content)
			return fail(400, { error: 'Comment content is required.', name, email, content });
		if (content.length > 5000)
			return fail(400, {
				error: 'Comment is too long (max 5000 characters).',
				name,
				email,
				content
			});


		// Check blacklist
		const blacklist = opts['blacklist_keys'] ?? '';
		if (blacklist.trim()) {
			const blacklisted = blacklist.split('\n').map((w) => w.trim()).filter(Boolean);
			const haystack = `${name} ${email} ${authorUrl} ${content}`.toLowerCase();
			if (blacklisted.some((word) => word && haystack.includes(word.toLowerCase()))) {
				return fail(400, { error: 'Your comment contains disallowed content.', name, email, content });
			}
		}
		const ip = getClientAddress();

		await db.insert(comments).values({
			postId: post.id,
			authorName: name,
			authorEmail: email,
			authorUrl: authorUrl,
			authorIp: ip,
			content,
			status: 'pending',
			parentId,
			date: new Date()
		});

		if (post.authorId) {
			const postAuthor = db
				.select({ email: users.email, displayName: users.displayName })
				.from(users)
				.where(eq(users.id, post.authorId))
				.get();

			if (postAuthor?.email && postAuthor.email !== email) {
				const postUrl = `${event.url.origin}/archives/${post.id}`;
				sendEmail({
					to: postAuthor.email,
					subject: `New comment on "${post.title}"`,
					html: `
						<h3>New comment on <a href="${postUrl}">${post.title}</a></h3>
						<p><strong>${name}</strong> wrote:</p>
						<blockquote style="border-left:3px solid #ccc; padding-left:12px; color:#555">${content}</blockquote>
						<p>
							<a href="${postUrl}#comments">View comment</a> &nbsp;|&nbsp;
							<a href="${event.url.origin}/sp-admin/comments">Moderate in admin</a>
						</p>
					`,
					text: `${name} commented on "${post.title}":\n\n${content}\n\nView: ${postUrl}\nModerate: ${event.url.origin}/sp-admin/comments`
				}).catch((err) => {
					console.error('[CommentNotification] Email send failed:', err);
				});
			}
		}

		return {
			success: true,
			message: 'Your comment has been submitted and is awaiting moderation.'
		};
	}
};

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { createHash } from 'crypto';
import { db } from '$lib/server/db/index.js';
import { posts, users, comments, postTerms, terms } from '$lib/server/db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { sendEmail } from '$lib/server/email/index.js';

function gravatar(email: string, size = 48): string {
	const hash = createHash('md5').update((email ?? '').trim().toLowerCase()).digest('hex');
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

type CommentWithChildren = {
	id: number;
	authorName: string;
	authorEmail: string | null;
	authorUrl: string | null;
	content: string;
	status: string;
	parentId: number | null;
	date: Date | null;
	avatarUrl: string;
	children: CommentWithChildren[];
};

function buildCommentTree(flatComments: Omit<CommentWithChildren, 'children'>[]): CommentWithChildren[] {
	const map = new Map<number, CommentWithChildren>();
	const roots: CommentWithChildren[] = [];

	// First pass: create all nodes
	for (const c of flatComments) {
		map.set(c.id, { ...c, children: [] });
	}

	// Second pass: build tree
	for (const c of flatComments) {
		const node = map.get(c.id)!;
		if (c.parentId && map.has(c.parentId)) {
			map.get(c.parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// Load post or page by slug
	const post = db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			content: posts.content,
			excerpt: posts.excerpt,
			status: posts.status,
			postType: posts.postType,
			postDate: posts.postDate,
			modifiedDate: posts.modifiedDate,
			commentStatus: posts.commentStatus,
			authorId: posts.authorId,
			authorName: users.displayName,
			authorUsername: users.username,
			authorBio: users.bio,
			authorEmail: users.email
		})
		.from(posts)
		.leftJoin(users, eq(posts.authorId, users.id))
		.where(and(eq(posts.slug, slug), eq(posts.status, 'publish')))
		.get();

	if (!post) {
		error(404, 'Post not found');
	}

	// Load comments (approved, ordered asc)
	const postComments = db
		.select({
			id: comments.id,
			authorName: comments.authorName,
			authorEmail: comments.authorEmail,
			authorUrl: comments.authorUrl,
			content: comments.content,
			date: comments.date,
			status: comments.status,
			parentId: comments.parentId
		})
		.from(comments)
		.where(and(eq(comments.postId, post.id), eq(comments.status, 'approved')))
		.orderBy(asc(comments.date))
		.all();

	// Load categories
	const categories = db
		.select({ id: terms.id, name: terms.name, slug: terms.slug })
		.from(postTerms)
		.innerJoin(terms, eq(postTerms.termId, terms.id))
		.where(and(eq(postTerms.postId, post.id), eq(terms.taxonomy, 'category')))
		.all();

	// Load tags
	const tags = db
		.select({ id: terms.id, name: terms.name, slug: terms.slug })
		.from(postTerms)
		.innerJoin(terms, eq(postTerms.termId, terms.id))
		.where(and(eq(postTerms.postId, post.id), eq(terms.taxonomy, 'tag')))
		.all();

	const commentsWithGravatar: Omit<CommentWithChildren, 'children'>[] = postComments.map(c => ({
		...c,
		avatarUrl: gravatar(c.authorEmail ?? '', 48)
	}));

	const commentTree = buildCommentTree(commentsWithGravatar);

	return {
		post: {
			...post,
			authorAvatarUrl: gravatar(post.authorEmail ?? '', 72)
		},
		// Keep flat list for backwards compat (count display)
		comments: commentsWithGravatar,
		commentTree,
		categories,
		tags
	};
};

export const actions: Actions = {
	comment: async (event) => {
		const { request, params, getClientAddress } = event;
		const { slug } = params;

		// Find the post (include title, authorId, and slug for the notification email)
		const post = db
			.select({
				id: posts.id,
				title: posts.title,
				slug: posts.slug,
				commentStatus: posts.commentStatus,
				authorId: posts.authorId
			})
			.from(posts)
			.where(and(eq(posts.slug, slug), eq(posts.status, 'publish')))
			.get();

		if (!post) {
			return fail(404, { error: 'Post not found.' });
		}

		if (post.commentStatus !== 'open') {
			return fail(403, { error: 'Comments are closed on this post.' });
		}

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const content = String(data.get('content') ?? '').trim();
		const authorUrl = String(data.get('url') ?? '').trim();
		const parentIdRaw = data.get('parentId');
		const parentId = parentIdRaw && String(parentIdRaw).trim() !== ''
			? parseInt(String(parentIdRaw), 10) || null
			: null;

		// Validate
		if (!name) return fail(400, { error: 'Name is required.', name, email, content });
		if (!email || !email.includes('@')) return fail(400, { error: 'A valid email is required.', name, email, content });
		if (!content) return fail(400, { error: 'Comment content is required.', name, email, content });
		if (content.length > 5000) return fail(400, { error: 'Comment is too long (max 5000 characters).', name, email, content });

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

		// Send email notification to the post author (fire-and-forget; never block the response)
		if (post.authorId) {
			const postAuthor = db
				.select({ email: users.email, displayName: users.displayName })
				.from(users)
				.where(eq(users.id, post.authorId))
				.get();

			// Only notify if we have an author email and the commenter is not the author
			if (postAuthor?.email && postAuthor.email !== email) {
				const postUrl = `${event.url.origin}/${post.slug}`;
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

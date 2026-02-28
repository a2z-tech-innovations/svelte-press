import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { createHash } from 'crypto';
import { db } from '$lib/server/db/index.js';

function gravatar(email: string, size = 48): string {
	const hash = createHash('md5').update((email ?? '').trim().toLowerCase()).digest('hex');
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}
import { posts, users, comments, postTerms, terms } from '$lib/server/db/schema.js';
import { eq, and, asc, count } from 'drizzle-orm';

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

	const commentsWithGravatar = postComments.map(c => ({
		...c,
		avatarUrl: gravatar(c.authorEmail ?? '', 48)
	}));

	return {
		post: {
			...post,
			authorAvatarUrl: gravatar(post.authorEmail ?? '', 72)
		},
		comments: commentsWithGravatar,
		categories,
		tags
	};
};

export const actions: Actions = {
	comment: async ({ request, params, getClientAddress }) => {
		const { slug } = params;

		// Find the post
		const post = db
			.select({ id: posts.id, commentStatus: posts.commentStatus })
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
			date: new Date()
		});

		return {
			success: true,
			message: 'Your comment has been submitted and is awaiting moderation.'
		};
	}
};

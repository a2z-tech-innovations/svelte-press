/**
 * Shared helper for loading a single published post with comments, categories, tags and gravatar.
 * Used by all permalink-structure routes so the same data shape is returned regardless of URL pattern.
 */
import { createHash } from 'crypto';
import { db } from '$lib/server/db/index.js';
import { posts, users, comments, postTerms, terms } from '$lib/server/db/schema.js';
import { eq, and, asc } from 'drizzle-orm';

function gravatar(email: string, size = 48): string {
	const hash = createHash('md5').update((email ?? '').trim().toLowerCase()).digest('hex');
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

export type CommentWithChildren = {
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

	for (const c of flatComments) {
		map.set(c.id, { ...c, children: [] });
	}
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

/**
 * Load a published post by ID. Returns null if not found or not published.
 */
export function loadPostById(id: number) {
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
		.where(and(eq(posts.id, id), eq(posts.status, 'publish'), eq(posts.postType, 'post')))
		.get();

	if (!post) return null;
	return enrichPost(post);
}

/**
 * Load a published post by slug. Returns null if not found or not published.
 */
export function loadPostBySlug(slug: string) {
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
		.where(and(eq(posts.slug, slug), eq(posts.status, 'publish'), eq(posts.postType, 'post')))
		.get();

	if (!post) return null;
	return enrichPost(post);
}

type RawPost = {
	id: number;
	title: string;
	slug: string;
	content: unknown;
	excerpt: string | null;
	status: string;
	postType: string;
	postDate: Date | null;
	modifiedDate: Date | null;
	commentStatus: string;
	authorId: number | null;
	authorName: string | null;
	authorUsername: string | null;
	authorBio: string | null;
	authorEmail: string | null;
};

function enrichPost(post: RawPost) {
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

	const commentsWithGravatar: Omit<CommentWithChildren, 'children'>[] = postComments.map((c) => ({
		...c,
		avatarUrl: gravatar(c.authorEmail ?? '', 48)
	}));

	const commentTree = buildCommentTree(commentsWithGravatar);

	return {
		post: {
			...post,
			authorAvatarUrl: gravatar(post.authorEmail ?? '', 72)
		},
		comments: commentsWithGravatar,
		commentTree,
		categories,
		tags
	};
}

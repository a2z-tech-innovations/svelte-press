import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB module before any imports that depend on it.
// The Drizzle query builder uses a fluent chain: db.select().from().where().get()
// We return the same mock object at every step so terminal methods (get/all)
// can be primed with specific return values per-test.
vi.mock('$lib/server/db/index.js', () => {
	const mock: Record<string, ReturnType<typeof vi.fn>> = {};
	const returnSelf = () => mock;
	mock.select = vi.fn(returnSelf);
	mock.from = vi.fn(returnSelf);
	mock.leftJoin = vi.fn(returnSelf);
	mock.innerJoin = vi.fn(returnSelf);
	mock.where = vi.fn(returnSelf);
	mock.orderBy = vi.fn(returnSelf);
	mock.get = vi.fn();
	mock.all = vi.fn();
	return { db: mock };
});

import { db } from '$lib/server/db/index.js';
import { loadPostById, loadPostBySlug } from '$lib/server/postLoader.js';

// Typed handle to the mock so we can set return values per-test
const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

// ─── fixtures ────────────────────────────────────────────────────────────────

const rawPost = {
	id: 1,
	title: 'Hello World',
	slug: 'hello-world',
	content: '<p>Content</p>',
	excerpt: 'Content',
	status: 'publish',
	postType: 'post',
	postDate: new Date('2026-01-15T12:00:00Z'),
	modifiedDate: new Date('2026-01-15T12:00:00Z'),
	commentStatus: 'open',
	authorId: 1,
	authorName: 'Jane Doe',
	authorUsername: 'janedoe',
	authorBio: 'A writer.',
	authorEmail: 'jane@example.com'
};

// The enrichPost call sequence for a found post is:
//   db...get()   → raw post
//   db...all()   → comments  (1st)
//   db...all()   → categories (2nd)
//   db...all()   → tags       (3rd)
function primeFoundPost(post = rawPost, comments = [], categories = [], tags = []) {
	mockDb.get.mockReturnValueOnce(post);
	mockDb.all
		.mockReturnValueOnce(comments)
		.mockReturnValueOnce(categories)
		.mockReturnValueOnce(tags);
}

// ─── shared beforeEach ───────────────────────────────────────────────────────

beforeEach(() => {
	vi.resetAllMocks();
	// Re-establish chaining after reset
	const returnSelf = () => mockDb;
	for (const m of ['select', 'from', 'leftJoin', 'innerJoin', 'where', 'orderBy']) {
		mockDb[m].mockImplementation(returnSelf);
	}
});

// ─── loadPostById ─────────────────────────────────────────────────────────────

describe('loadPostById()', () => {
	it('returns null when the post is not found', () => {
		mockDb.get.mockReturnValueOnce(undefined);
		expect(loadPostById(999)).toBeNull();
	});

	it('returns an object when the post is found', () => {
		primeFoundPost();
		expect(loadPostById(1)).not.toBeNull();
	});

	it('includes the post title', () => {
		primeFoundPost();
		expect(loadPostById(1)?.post.title).toBe('Hello World');
	});

	it('includes the post slug', () => {
		primeFoundPost();
		expect(loadPostById(1)?.post.slug).toBe('hello-world');
	});

	it('includes an author avatar URL (gravatar format)', () => {
		primeFoundPost();
		const result = loadPostById(1);
		expect(result?.post.authorAvatarUrl).toMatch(
			/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?s=72&d=mp$/
		);
	});

	it('returns an empty comments array when there are no approved comments', () => {
		primeFoundPost();
		expect(loadPostById(1)?.comments).toEqual([]);
	});

	it('returns an empty commentTree when there are no comments', () => {
		primeFoundPost();
		expect(loadPostById(1)?.commentTree).toEqual([]);
	});

	it('returns an empty categories array when no categories are assigned', () => {
		primeFoundPost();
		expect(loadPostById(1)?.categories).toEqual([]);
	});

	it('returns an empty tags array when no tags are assigned', () => {
		primeFoundPost();
		expect(loadPostById(1)?.tags).toEqual([]);
	});

	it('includes categories in the result', () => {
		const categories = [{ id: 10, name: 'Tech', slug: 'tech' }];
		primeFoundPost(rawPost, [], categories, []);
		expect(loadPostById(1)?.categories).toEqual(categories);
	});

	it('includes tags in the result', () => {
		const tags = [{ id: 20, name: 'SvelteKit', slug: 'sveltekit' }];
		primeFoundPost(rawPost, [], [], tags);
		expect(loadPostById(1)?.tags).toEqual(tags);
	});

	it('attaches gravatar avatar URLs to comments', () => {
		const comments = [
			{
				id: 1,
				authorName: 'Bob',
				authorEmail: 'bob@example.com',
				authorUrl: null,
				content: 'Nice post!',
				date: new Date(),
				status: 'approved',
				parentId: null
			}
		];
		primeFoundPost(rawPost, comments, [], []);
		const result = loadPostById(1);
		expect(result?.comments[0].avatarUrl).toMatch(/gravatar\.com\/avatar\//);
	});

	describe('comment tree building', () => {
		it('places top-level comments at the root of the tree', () => {
			const comments = [
				{ id: 1, authorName: 'Alice', authorEmail: null, authorUrl: null,
				  content: 'Root comment', date: new Date(), status: 'approved', parentId: null }
			];
			primeFoundPost(rawPost, comments, [], []);
			const tree = loadPostById(1)!.commentTree;
			expect(tree).toHaveLength(1);
			expect(tree[0].authorName).toBe('Alice');
		});

		it('nests a reply under its parent comment', () => {
			const comments = [
				{ id: 1, authorName: 'Alice', authorEmail: null, authorUrl: null,
				  content: 'Root', date: new Date(), status: 'approved', parentId: null },
				{ id: 2, authorName: 'Bob', authorEmail: null, authorUrl: null,
				  content: 'Reply', date: new Date(), status: 'approved', parentId: 1 }
			];
			primeFoundPost(rawPost, comments, [], []);
			const tree = loadPostById(1)!.commentTree;
			expect(tree).toHaveLength(1); // only 1 root
			expect(tree[0].children).toHaveLength(1);
			expect(tree[0].children[0].authorName).toBe('Bob');
		});

		it('supports multiple root-level comments', () => {
			const comments = [
				{ id: 1, authorName: 'Alice', authorEmail: null, authorUrl: null,
				  content: 'First', date: new Date(), status: 'approved', parentId: null },
				{ id: 2, authorName: 'Bob', authorEmail: null, authorUrl: null,
				  content: 'Second', date: new Date(), status: 'approved', parentId: null }
			];
			primeFoundPost(rawPost, comments, [], []);
			const tree = loadPostById(1)!.commentTree;
			expect(tree).toHaveLength(2);
		});

		it('treats a reply whose parent is missing as a root comment', () => {
			const comments = [
				{ id: 2, authorName: 'Bob', authorEmail: null, authorUrl: null,
				  content: 'Orphan', date: new Date(), status: 'approved', parentId: 999 }
			];
			primeFoundPost(rawPost, comments, [], []);
			const tree = loadPostById(1)!.commentTree;
			expect(tree).toHaveLength(1);
		});
	});
});

// ─── loadPostBySlug ───────────────────────────────────────────────────────────

describe('loadPostBySlug()', () => {
	it('returns null when the post is not found', () => {
		mockDb.get.mockReturnValueOnce(undefined);
		expect(loadPostBySlug('nonexistent-slug')).toBeNull();
	});

	it('returns an object when the post is found', () => {
		primeFoundPost();
		expect(loadPostBySlug('hello-world')).not.toBeNull();
	});

	it('includes the post title', () => {
		primeFoundPost();
		expect(loadPostBySlug('hello-world')?.post.title).toBe('Hello World');
	});

	it('includes the author avatar URL', () => {
		primeFoundPost();
		const result = loadPostBySlug('hello-world');
		expect(result?.post.authorAvatarUrl).toMatch(/gravatar\.com\/avatar\//);
	});

	it('includes categories and tags', () => {
		const categories = [{ id: 10, name: 'Tech', slug: 'tech' }];
		const tags = [{ id: 20, name: 'SvelteKit', slug: 'sveltekit' }];
		primeFoundPost(rawPost, [], categories, tags);
		const result = loadPostBySlug('hello-world');
		expect(result?.categories).toEqual(categories);
		expect(result?.tags).toEqual(tags);
	});
});

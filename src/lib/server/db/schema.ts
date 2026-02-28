import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	displayName: text('display_name').notNull(),
	bio: text('bio').default(''),
	avatar: text('avatar').default(''),
	role: text('role', {
		enum: ['admin', 'editor', 'author', 'contributor', 'subscriber']
	})
		.notNull()
		.default('subscriber'),
	registeredAt: integer('registered_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	lastLogin: integer('last_login', { mode: 'timestamp' })
});

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(), // nanoid
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`)
	},
	(t) => [index('sessions_user_id_idx').on(t.userId)]
);

// ─── Media ───────────────────────────────────────────────────────────────────

export const media = sqliteTable('media', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	filename: text('filename').notNull(),
	originalName: text('original_name').notNull(),
	mimeType: text('mime_type').notNull(),
	size: integer('size').notNull().default(0),
	width: integer('width'),
	height: integer('height'),
	alt: text('alt').default(''),
	caption: text('caption').default(''),
	description: text('description').default(''),
	uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
	uploadedAt: integer('uploaded_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	path: text('path').notNull(),
	// JSON: { thumbnail: string, medium: string, large: string }
	sizes: text('sizes', { mode: 'json' }).$type<Record<string, string>>().default({})
});

// ─── Posts ───────────────────────────────────────────────────────────────────

export const posts = sqliteTable(
	'posts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		title: text('title').notNull().default(''),
		slug: text('slug').notNull(),
		// JSON: Block[]
		content: text('content', { mode: 'json' }).$type<unknown[]>().notNull().default([]),
		excerpt: text('excerpt').default(''),
		status: text('status', {
			enum: ['draft', 'publish', 'private', 'future', 'trash', 'pending']
		})
			.notNull()
			.default('draft'),
		commentStatus: text('comment_status', { enum: ['open', 'closed'] })
			.notNull()
			.default('open'),
		postDate: integer('post_date', { mode: 'timestamp' }),
		modifiedDate: integer('modified_date', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		authorId: integer('author_id')
			.notNull()
			.references(() => users.id),
		parentId: integer('parent_id'),
		postType: text('post_type', { enum: ['post', 'page', 'attachment', 'nav_menu_item'] })
			.notNull()
			.default('post'),
		menuOrder: integer('menu_order').notNull().default(0),
		format: text('format', {
			enum: [
				'standard',
				'aside',
				'gallery',
				'link',
				'image',
				'quote',
				'status',
				'video',
				'audio',
				'chat'
			]
		})
			.notNull()
			.default('standard'),
		sticky: integer('sticky', { mode: 'boolean' }).notNull().default(false),
		featuredImageId: integer('featured_image_id').references(() => media.id, {
			onDelete: 'set null'
		}),
		template: text('template').default('')
	},
	(t) => [
		uniqueIndex('posts_slug_type_idx').on(t.slug, t.postType),
		index('posts_status_idx').on(t.status),
		index('posts_author_idx').on(t.authorId),
		index('posts_date_idx').on(t.postDate),
		index('posts_type_idx').on(t.postType)
	]
);

// ─── Terms (Categories, Tags, Navigation Menus) ───────────────────────────────

export const terms = sqliteTable(
	'terms',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		description: text('description').default(''),
		taxonomy: text('taxonomy', { enum: ['category', 'tag', 'nav_menu'] }).notNull(),
		parentId: integer('parent_id'),
		count: integer('count').notNull().default(0)
	},
	(t) => [
		uniqueIndex('terms_slug_taxonomy_idx').on(t.slug, t.taxonomy),
		index('terms_taxonomy_idx').on(t.taxonomy)
	]
);

export const postTerms = sqliteTable(
	'post_terms',
	{
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		termId: integer('term_id')
			.notNull()
			.references(() => terms.id, { onDelete: 'cascade' })
	},
	(t) => [index('post_terms_post_idx').on(t.postId), index('post_terms_term_idx').on(t.termId)]
);

// ─── Comments ────────────────────────────────────────────────────────────────

export const comments = sqliteTable(
	'comments',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
		authorName: text('author_name').notNull().default(''),
		authorEmail: text('author_email').notNull().default(''),
		authorUrl: text('author_url').default(''),
		authorIp: text('author_ip').default(''),
		content: text('content').notNull(),
		status: text('status', { enum: ['approved', 'pending', 'spam', 'trash'] })
			.notNull()
			.default('pending'),
		parentId: integer('parent_id'),
		date: integer('date', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(t) => [index('comments_post_idx').on(t.postId), index('comments_status_idx').on(t.status)]
);

// ─── Options (Key-Value Store) ────────────────────────────────────────────────

export const options = sqliteTable('options', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	optionName: text('option_name').notNull().unique(),
	optionValue: text('option_value').notNull().default(''),
	autoload: integer('autoload', { mode: 'boolean' }).notNull().default(true)
});

// ─── Navigation Menus ─────────────────────────────────────────────────────────

export const menus = sqliteTable('menus', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	location: text('location').default('')
});

export const menuItems = sqliteTable(
	'menu_items',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		menuId: integer('menu_id')
			.notNull()
			.references(() => menus.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		url: text('url').default(''),
		postId: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
		termId: integer('term_id').references(() => terms.id, { onDelete: 'set null' }),
		order: integer('order').notNull().default(0),
		parentId: integer('parent_id'),
		target: text('target').default(''),
		classes: text('classes').default('')
	},
	(t) => [index('menu_items_menu_idx').on(t.menuId)]
);

// ─── Post Meta ────────────────────────────────────────────────────────────────

export const postMeta = sqliteTable(
	'post_meta',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		metaKey: text('meta_key').notNull(),
		metaValue: text('meta_value').default('')
	},
	(t) => [index('post_meta_post_idx').on(t.postId), index('post_meta_key_idx').on(t.metaKey)]
);

// ─── User Meta ────────────────────────────────────────────────────────────────

export const userMeta = sqliteTable(
	'user_meta',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		metaKey: text('meta_key').notNull(),
		metaValue: text('meta_value').default('')
	},
	(t) => [index('user_meta_user_idx').on(t.userId), index('user_meta_key_idx').on(t.metaKey)]
);

// ─── Revisions ────────────────────────────────────────────────────────────────

export const revisions = sqliteTable(
	'revisions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		title: text('title').notNull().default(''),
		content: text('content', { mode: 'json' }).$type<unknown[]>().notNull().default([]),
		excerpt: text('excerpt').default(''),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		userId: integer('user_id').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => [index('revisions_post_idx').on(t.postId)]
);

// ─── Widgets ──────────────────────────────────────────────────────────────────

export const widgets = sqliteTable('widgets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	area: text('area').notNull(),
	widgetType: text('widget_type').notNull(),
	// JSON: widget-specific settings
	settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
	order: integer('order').notNull().default(0)
});

// ─── Activity Log ─────────────────────────────────────────────────────────────

export const activityLog = sqliteTable(
	'activity_log',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id'),
		userDisplayName: text('user_display_name'),
		action: text('action').notNull(),
		objectType: text('object_type'),
		objectId: integer('object_id'),
		objectTitle: text('object_title'),
		details: text('details'),
		ip: text('ip'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(strftime('%s', 'now'))`)
	},
	(t) => [
		index('activity_log_user_idx').on(t.userId),
		index('activity_log_action_idx').on(t.action),
		index('activity_log_created_idx').on(t.createdAt)
	]
);

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';

export interface User {
	id: number;
	username: string;
	email: string;
	displayName: string;
	bio: string;
	avatar: string;
	role: UserRole;
	registeredAt: Date;
	lastLogin: Date | null;
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export type BlockType =
	| 'paragraph'
	| 'heading'
	| 'image'
	| 'gallery'
	| 'video'
	| 'quote'
	| 'pullquote'
	| 'code'
	| 'preformatted'
	| 'list'
	| 'separator'
	| 'spacer'
	| 'table'
	| 'columns'
	| 'button'
	| 'embed'
	| 'html'
	| 'shortcode';

export interface Block {
	id: string;
	type: BlockType;
	content: string;
	attrs: Record<string, unknown>;
	// For columns/nested blocks
	innerBlocks?: Block[];
}

// ─── Post ─────────────────────────────────────────────────────────────────────

export type PostStatus = 'draft' | 'publish' | 'private' | 'future' | 'trash' | 'pending';
export type PostType = 'post' | 'page' | 'attachment' | 'nav_menu_item';
export type PostFormat =
	| 'standard'
	| 'aside'
	| 'gallery'
	| 'link'
	| 'image'
	| 'quote'
	| 'status'
	| 'video'
	| 'audio'
	| 'chat';
export type CommentStatus = 'open' | 'closed';

export interface Post {
	id: number;
	title: string;
	slug: string;
	content: Block[];
	excerpt: string;
	status: PostStatus;
	commentStatus: CommentStatus;
	postDate: Date | null;
	modifiedDate: Date;
	authorId: number;
	author?: User;
	parentId: number | null;
	postType: PostType;
	menuOrder: number;
	format: PostFormat;
	sticky: boolean;
	featuredImageId: number | null;
	featuredImage?: MediaItem;
	template: string;
	categories?: Term[];
	tags?: Term[];
}

// ─── Term ─────────────────────────────────────────────────────────────────────

export type Taxonomy = 'category' | 'tag' | 'nav_menu';

export interface Term {
	id: number;
	name: string;
	slug: string;
	description: string;
	taxonomy: Taxonomy;
	parentId: number | null;
	count: number;
	children?: Term[];
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export type CommentStatusFilter = 'approved' | 'pending' | 'spam' | 'trash';

export interface Comment {
	id: number;
	postId: number;
	post?: Pick<Post, 'id' | 'title' | 'slug'>;
	authorId: number | null;
	author?: User;
	authorName: string;
	authorEmail: string;
	authorUrl: string;
	authorIp: string;
	content: string;
	status: CommentStatusFilter;
	parentId: number | null;
	date: Date;
	children?: Comment[];
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface MediaItem {
	id: number;
	filename: string;
	originalName: string;
	mimeType: string;
	size: number;
	width: number | null;
	height: number | null;
	alt: string;
	caption: string;
	description: string;
	uploadedBy: number | null;
	uploader?: User;
	uploadedAt: Date;
	path: string;
	sizes: Record<string, string>;
	url: string;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface Menu {
	id: number;
	name: string;
	slug: string;
	location: string;
	items?: MenuItem[];
}

export interface MenuItem {
	id: number;
	menuId: number;
	title: string;
	url: string;
	postId: number | null;
	termId: number | null;
	order: number;
	parentId: number | null;
	target: string;
	classes: string;
	children?: MenuItem[];
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export type WidgetType =
	| 'recent-posts'
	| 'recent-comments'
	| 'archives'
	| 'categories'
	| 'tag-cloud'
	| 'search'
	| 'text'
	| 'custom-html';

export interface Widget {
	id: number;
	area: string;
	widgetType: WidgetType;
	settings: Record<string, unknown>;
	order: number;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface ThemeInfo {
	slug: string;
	name: string;
	version: string;
	author: string;
	description: string;
	screenshot: string;
	supports: string[];
	menus: Record<string, string>;
	widgetAreas: Record<string, string>;
	active: boolean;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export interface PluginInfo {
	slug: string;
	name: string;
	version: string;
	author: string;
	description: string;
	active: boolean;
}

// ─── Revision ─────────────────────────────────────────────────────────────────

export interface Revision {
	id: number;
	postId: number;
	title: string;
	content: Block[];
	excerpt: string;
	createdAt: Date;
	userId: number | null;
	author?: User;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
	items: T[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

// ─── App Locals (SvelteKit) ───────────────────────────────────────────────────

export interface AppLocals {
	user: User | null;
	sessionId: string | null;
}

// ─── Threaded Comments ────────────────────────────────────────────────────────

export interface CommentNode {
	id: number;
	authorName: string;
	authorUrl: string | null;
	content: string;
	date: Date | null;
	avatarUrl: string;
	children: CommentNode[];
}

import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { createHash } from 'crypto';
import { db } from '$lib/server/db/index.js';
import { posts, users, comments, postTerms, terms, postMeta, options, forms, formSubmissions } from '$lib/server/db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { sendEmail } from '$lib/server/email/index.js';
import { getPermalinkUrl } from '$lib/utils.js';
import { generateZodSchema } from '$lib/server/forms/index.js';
import { logActivity } from '$lib/server/activity/index.js';
import type { FormConfig, FormField, FormSettings } from '$lib/types/index.js';

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

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const { slug } = params;

	// Load post or page by slug — allow both published and password-protected (private) posts
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
		.where(and(eq(posts.slug, slug)))
		.get();

	if (!post || (post.status !== 'publish' && post.status !== 'private')) {
		error(404, 'Post not found');
	}

	// For posts (not pages), redirect to canonical permalink URL when structure requires a different path.
	// This turns old /slug links into canonical URLs transparently.
	if (post.postType === 'post' && post.status === 'publish') {
		const permalinkOpt = db
			.select({ optionValue: options.optionValue })
			.from(options)
			.where(eq(options.optionName, 'permalink_structure'))
			.get();

		const structure = permalinkOpt?.optionValue ?? '/%postname%/';

		// Only redirect away from this [slug] route when structure is not post-name or plain
		if (
			structure !== '/%postname%/' &&
			structure !== '' &&
			structure !== null
		) {
			const canonicalPath = getPermalinkUrl(
				{ id: post.id, slug: post.slug, postDate: post.postDate },
				structure
			);
			// Compare without trailing slash to handle both /slug and /slug/
			const normCurrent = url.pathname.replace(/\/$/, '');
			const normCanonical = canonicalPath.replace(/\/$/, '');
			if (normCurrent !== normCanonical) {
				redirect(301, canonicalPath);
			}
		}
	}

	// Check if this private post has a password gate
	if (post.status === 'private') {
		const passwordMeta = db
			.select({ metaValue: postMeta.metaValue })
			.from(postMeta)
			.where(and(eq(postMeta.postId, post.id), eq(postMeta.metaKey, 'post_password')))
			.get();

		const hasPassword = passwordMeta && passwordMeta.metaValue && passwordMeta.metaValue.length > 0;

		if (hasPassword) {
			// Check if visitor has the unlock cookie
			const unlockCookie = cookies.get(`pp_${post.id}`);
			if (!unlockCookie) {
				// Return only safe fields — no content
				return {
					post: {
						id: post.id,
						title: post.title,
						slug: post.slug,
						content: [] as unknown[],
						excerpt: '',
						status: post.status,
						postType: post.postType,
						postDate: post.postDate,
						modifiedDate: post.modifiedDate,
						commentStatus: post.commentStatus,
						authorId: post.authorId,
						authorName: post.authorName,
						authorUsername: post.authorUsername,
						authorBio: post.authorBio,
						authorEmail: post.authorEmail,
						authorAvatarUrl: gravatar(post.authorEmail ?? '', 72)
					},
					passwordRequired: true,
					comments: [],
					commentTree: [],
					categories: [],
					tags: [],
					forms: {} as Record<string, FormConfig>
				};
			}
		}
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

	// Load form configs for any form nodes in Tiptap content
	const formConfigs: Record<string, FormConfig> = {};
	const content = post.content;
	if (content && typeof content === 'object' && !Array.isArray(content)) {
		const doc = content as { type?: string; content?: unknown[] };
		if (doc.type === 'doc' && Array.isArray(doc.content)) {
			for (const node of doc.content) {
				const n = node as { type?: string; attrs?: { nodeId?: string } };
				if (n.type === 'form' && n.attrs?.nodeId) {
					const row = db.select().from(forms).where(eq(forms.nodeId, n.attrs.nodeId)).get();
					if (row) {
						formConfigs[n.attrs.nodeId] = {
							nodeId: row.nodeId,
							title: row.title,
							fields: (row.fields as unknown as FormField[]) ?? [],
							settings: (row.settings as unknown as FormSettings) ?? {
								submitLabel: 'Send',
								successMessage: 'Thank you for your submission!',
								emailNotification: false
							}
						};
					}
				}
			}
		}
	}

	return {
		post: {
			...post,
			authorAvatarUrl: gravatar(post.authorEmail ?? '', 72)
		},
		// Keep flat list for backwards compat (count display)
		comments: commentsWithGravatar,
		commentTree,
		categories,
		tags,
		forms: formConfigs
	};
};

export const actions: Actions = {
	unlock: async ({ request, cookies, params }) => {
		const { slug } = params;

		const post = db
			.select({ id: posts.id })
			.from(posts)
			.where(eq(posts.slug, slug))
			.get();

		if (!post) return fail(404, { passwordError: 'Post not found.' });

		const meta = db
			.select({ metaValue: postMeta.metaValue })
			.from(postMeta)
			.where(and(eq(postMeta.postId, post.id), eq(postMeta.metaKey, 'post_password')))
			.get();

		if (!meta || !meta.metaValue) {
			return fail(400, { passwordError: 'This post is not password protected.' });
		}

		const data = await request.formData();
		const password = String(data.get('password') ?? '');

		if (password !== meta.metaValue) {
			return fail(400, { passwordError: 'Incorrect password. Please try again.' });
		}

		cookies.set(`pp_${post.id}`, '1', {
			path: '/',
			httpOnly: true,
			maxAge: 60 * 60 * 24,
			sameSite: 'lax'
		});

		redirect(302, `/${slug}`);
	},

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
				authorId: posts.authorId,
				postDate: posts.postDate
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
		const parentId = parentIdRaw && String(parentIdRaw).trim() !== ''
			? parseInt(String(parentIdRaw), 10) || null
			: null;

		// Validate
		if (!name) return fail(400, { error: 'Name is required.', name, email, content });
		if (!email || !email.includes('@')) return fail(400, { error: 'A valid email is required.', name, email, content });
		if (!content) return fail(400, { error: 'Comment content is required.', name, email, content });
		if (content.length > 5000) return fail(400, { error: 'Comment is too long (max 5000 characters).', name, email, content });

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

		// Send email notification to the post author (fire-and-forget; never block the response)
		if (post.authorId) {
			const postAuthor = db
				.select({ email: users.email, displayName: users.displayName })
				.from(users)
				.where(eq(users.id, post.authorId))
				.get();

			// Only notify if we have an author email and the commenter is not the author
			if (postAuthor?.email && postAuthor.email !== email) {
				const postUrl = `${event.url.origin}${event.url.pathname}`;
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
	},

	submitForm: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const nodeId = String(data.get('_formNodeId') ?? '');

		if (!nodeId) return fail(400, { formError: 'Invalid form.' });

		// Load form row directly for id + config
		const formRow = db.select().from(forms).where(eq(forms.nodeId, nodeId)).get();
		if (!formRow) return fail(404, { formError: 'Form not found.' });

		const formConfig: FormConfig = {
			nodeId: formRow.nodeId,
			title: formRow.title,
			fields: (formRow.fields as unknown as FormField[]) ?? [],
			settings: (formRow.settings as unknown as FormSettings) ?? {
				submitLabel: 'Send',
				successMessage: 'Thank you for your submission!',
				emailNotification: false
			}
		};

		// Honeypot check
		const honeypot = String(data.get('_honeypot') ?? '');
		if (honeypot.length > 0) {
			return { formSubmitted: nodeId };
		}

		// Build submission data from FormData
		const submissionData: Record<string, unknown> = {};
		for (const field of formConfig.fields) {
			if (field.type === 'hidden') {
				submissionData[field.id] = field.defaultValue ?? '';
			} else {
				submissionData[field.id] = data.get(field.id) ?? '';
			}
		}

		// Validate using Zod schema
		const schema = generateZodSchema(formConfig.fields);
		const parsed = schema.safeParse(submissionData);
		if (!parsed.success) {
			const errors: Record<string, string[]> = {};
			for (const [path, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
				errors[path] = issues as string[];
			}
			return fail(400, { formErrors: errors, formNodeId: nodeId });
		}

		// Store submission
		const ipAddress = getClientAddress();
		const userAgent = request.headers.get('user-agent') ?? '';

		await db.insert(formSubmissions).values({
			formId: formRow.id,
			data: parsed.data as Record<string, unknown>,
			ipAddress,
			userAgent,
			status: 'unread'
		});

		// Email notification
		if (formConfig.settings.emailNotification) {
			const adminOpt = db
				.select({ optionValue: options.optionValue })
				.from(options)
				.where(eq(options.optionName, 'admin_email'))
				.get();
			const adminEmail = adminOpt?.optionValue ?? '';
			const to = formConfig.settings.notificationEmail || adminEmail;
			if (to) {
				const bodyLines = formConfig.fields
					.filter(f => f.type !== 'hidden')
					.map(f => `<strong>${f.label}:</strong> ${String(parsed.data[f.id] ?? '')}`)
					.join('<br>');
				sendEmail({
					to,
					subject: `New form submission: ${formConfig.title}`,
					html: `<h3>New submission for &quot;${formConfig.title}&quot;</h3>${bodyLines}`,
					text: formConfig.fields
						.filter(f => f.type !== 'hidden')
						.map(f => `${f.label}: ${String(parsed.data[f.id] ?? '')}`)
						.join('\n')
				}).catch(() => {});
			}
		}

		logActivity({
			userId: locals.user?.id,
			action: 'form_submitted',
			objectType: 'form',
			objectTitle: formConfig.title
		}).catch(() => {});

		return { formSubmitted: nodeId };
	}
};

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, terms, postTerms, comments, options } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	export: async ({ request }) => {
		const data = await request.formData();
		const contentType = String(data.get('contentType') ?? 'all');

		let postData: typeof posts.$inferSelect[] = [];

		if (contentType === 'all' || contentType === 'posts') {
			const allPosts = db.select().from(posts).where(eq(posts.postType, 'post')).all();
			postData = [...postData, ...allPosts];
		}
		if (contentType === 'all' || contentType === 'pages') {
			const allPages = db.select().from(posts).where(eq(posts.postType, 'page')).all();
			postData = [...postData, ...allPages];
		}

		const allUsers = db.select().from(users).all();
		const allTerms = db.select().from(terms).all();
		const allPostTerms = db.select().from(postTerms).all();
		const allComments = db.select().from(comments).all();
		const blogname = db.select().from(options).where(eq(options.optionName, 'blogname')).get()?.optionValue ?? 'SveltePress';
		const siteurl = db.select().from(options).where(eq(options.optionName, 'siteurl')).get()?.optionValue ?? '';

		const now = new Date().toUTCString();

		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:wp="http://wordpress.org/export/1.2/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${blogname}</title>
  <link>${siteurl}</link>
  <description>SveltePress WXR Export</description>
  <pubDate>${now}</pubDate>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>${siteurl}</wp:base_site_url>
${allTerms.map((t) => `  <wp:term>
    <wp:term_id>${t.id}</wp:term_id>
    <wp:term_taxonomy>${t.taxonomy}</wp:term_taxonomy>
    <wp:term_slug>${t.slug}</wp:term_slug>
    <wp:term_name><![CDATA[${t.name}]]></wp:term_name>
  </wp:term>`).join('\n')}
${postData.map((p) => {
  const author = allUsers.find((u) => u.id === p.authorId);
  const postComments = allComments.filter((c) => c.postId === p.id);
  const postTermIds = allPostTerms.filter((pt) => pt.postId === p.id).map((pt) => pt.termId);
  const postTermList = allTerms.filter((t) => postTermIds.includes(t.id));
  return `  <item>
    <title><![CDATA[${p.title}]]></title>
    <wp:post_id>${p.id}</wp:post_id>
    <wp:post_name>${p.slug}</wp:post_name>
    <wp:post_type>${p.postType}</wp:post_type>
    <wp:status>${p.status}</wp:status>
    <dc:creator>${author?.username ?? ''}</dc:creator>
    <content:encoded><![CDATA[${JSON.stringify(p.content)}]]></content:encoded>
    <wp:post_date>${p.postDate?.toISOString() ?? ''}</wp:post_date>
${postTermList.map((t) => `    <category domain="${t.taxonomy}" nicename="${t.slug}"><![CDATA[${t.name}]]></category>`).join('\n')}
${postComments.map((c) => `    <wp:comment>
      <wp:comment_id>${c.id}</wp:comment_id>
      <wp:comment_author><![CDATA[${c.authorName}]]></wp:comment_author>
      <wp:comment_author_email>${c.authorEmail}</wp:comment_author_email>
      <wp:comment_content><![CDATA[${c.content}]]></wp:comment_content>
      <wp:comment_status>${c.status}</wp:comment_status>
      <wp:comment_date>${c.date?.toISOString() ?? ''}</wp:comment_date>
    </wp:comment>`).join('\n')}
  </item>`;
}).join('\n')}
</channel>
</rss>`;

		return {
			exportXml: xml,
			exportSuccess: true,
			contentType
		};
	},

	import: async ({ request, locals }) => {
		const data = await request.formData();
		const file = data.get('wxrFile') as File | null;

		if (!file || !(file instanceof File) || file.size === 0) {
			return fail(400, { importError: 'No file provided.' });
		}

		const xml = await file.text();

		// Very basic WXR parser
		const getTagContent = (str: string, tag: string) => {
			const match = str.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i'));
			return match?.[1]?.trim() ?? '';
		};

		const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];
		let imported = 0;

		for (const item of itemMatches) {
			const title = getTagContent(item, 'title');
			const slug = getTagContent(item, 'wp:post_name') || slugify(title) || nanoid(8);
			const postType = getTagContent(item, 'wp:post_type') as 'post' | 'page';
			const status = getTagContent(item, 'wp:status') as 'draft' | 'publish' | 'private' | 'pending' | 'trash';

			if (!['post', 'page'].includes(postType)) continue;

			const contentRaw = getTagContent(item, 'content:encoded');
			let content: unknown[] = [];
			try {
				content = JSON.parse(contentRaw);
			} catch {
				if (contentRaw) {
					content = [{ id: nanoid(), type: 'paragraph', content: contentRaw, attrs: {} }];
				}
			}

			try {
				await db.insert(posts).values({
					title: title || '(imported)',
					slug,
					content,
					status: status || 'draft',
					postType,
					authorId: locals.user!.id,
					modifiedDate: new Date(),
					postDate: null
				});
				imported++;
			} catch {
				// Skip duplicate slugs
			}
		}

		return { importSuccess: true, importedCount: imported };
	}
};

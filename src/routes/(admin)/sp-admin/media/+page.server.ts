import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { media, users } from '$lib/server/db/schema.js';
import { eq, desc, like, count, and, sql, inArray } from 'drizzle-orm';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { can } from '$lib/server/permissions/index.js';

const PER_PAGE = 40;

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const mimeFilter = url.searchParams.get('type') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const view = url.searchParams.get('view') ?? 'grid';
	const showUpload = url.searchParams.get('upload') === '1';

	const conditions = [];
	if (search) conditions.push(like(media.originalName, `%${search}%`));
	if (mimeFilter) conditions.push(like(media.mimeType, `${mimeFilter}%`));

	const whereClause = conditions.length ? and(...conditions) : sql`1=1`;

	const [{ count: total }] = db
		.select({ count: count() })
		.from(media)
		.where(whereClause)
		.all();

	const offset = (page - 1) * PER_PAGE;

	const items = db
		.select({
			id: media.id,
			filename: media.filename,
			originalName: media.originalName,
			mimeType: media.mimeType,
			size: media.size,
			width: media.width,
			height: media.height,
			alt: media.alt,
			caption: media.caption,
			path: media.path,
			sizes: media.sizes,
			uploadedAt: media.uploadedAt,
			uploaderName: users.displayName
		})
		.from(media)
		.leftJoin(users, eq(media.uploadedBy, users.id))
		.where(whereClause)
		.orderBy(desc(media.uploadedAt))
		.limit(PER_PAGE)
		.offset(offset)
		.all();

	return {
		items,
		total: Number(total),
		page,
		perPage: PER_PAGE,
		search,
		mimeFilter,
		view,
		showUpload
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const data = await request.formData();
		const files = data.getAll('files') as File[];

		if (!files.length || !(files[0] instanceof File)) {
			return fail(400, { error: 'No files provided.' });
		}

		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const uploadDir = join('static', 'uploads', String(year), month);

		if (!existsSync(uploadDir)) {
			mkdirSync(uploadDir, { recursive: true });
		}

		const uploaded: number[] = [];

		for (const file of files) {
			if (!(file instanceof File) || file.size === 0) continue;

			const buffer = Buffer.from(await file.arrayBuffer());
			const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
			const baseName = nanoid(12);
			const filename = `${baseName}.${ext}`;
			const filePath = join(uploadDir, filename);
			const relativePath = `uploads/${year}/${month}/${filename}`;

			writeFileSync(filePath, buffer);

			let width: number | null = null;
			let height: number | null = null;
			const sizes: Record<string, string> = {};

			if (file.type.startsWith('image/')) {
				try {
					const meta = await sharp(buffer).metadata();
					width = meta.width ?? null;
					height = meta.height ?? null;

					// Thumbnail: 150x150 crop
					const thumbName = `${baseName}-150x150.${ext}`;
					await sharp(buffer)
						.resize(150, 150, { fit: 'cover' })
						.toFile(join(uploadDir, thumbName));
					sizes.thumbnail = `uploads/${year}/${month}/${thumbName}`;

					// Medium: 300 wide max
					const medName = `${baseName}-300.${ext}`;
					await sharp(buffer)
						.resize(300, undefined, { fit: 'inside', withoutEnlargement: true })
						.toFile(join(uploadDir, medName));
					sizes.medium = `uploads/${year}/${month}/${medName}`;

					// Large: 1024 wide max
					const lgName = `${baseName}-1024.${ext}`;
					await sharp(buffer)
						.resize(1024, undefined, { fit: 'inside', withoutEnlargement: true })
						.toFile(join(uploadDir, lgName));
					sizes.large = `uploads/${year}/${month}/${lgName}`;
				} catch {
					// image processing failed, continue without sizes
				}
			}

			const result = await db.insert(media).values({
				filename,
				originalName: file.name,
				mimeType: file.type || 'application/octet-stream',
				size: file.size,
				width,
				height,
				alt: '',
				caption: '',
				description: '',
				uploadedBy: locals.user!.id,
				uploadedAt: now,
				path: relativePath,
				sizes
			}).returning({ id: media.id });

			uploaded.push(result[0].id);
		}

		return { success: true, uploaded };
	},

	bulkDelete: async ({ request, locals }) => {
		if (!locals.user || !can(locals.user.role, 'delete_posts')) {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const ids = data.getAll('mediaIds').map(Number).filter(Boolean);

		if (!ids.length) {
			return fail(400, { error: 'No items selected' });
		}

		// Fetch media rows so we can delete files from disk
		const rows = db
			.select({ id: media.id, path: media.path, sizes: media.sizes })
			.from(media)
			.where(inArray(media.id, ids))
			.all();

		// Delete files from disk (main file + all size variants)
		for (const row of rows) {
			const pathsToDelete: string[] = [];

			// Main file — path stored as "uploads/YYYY/MM/file.jpg" (no leading slash)
			if (row.path) {
				pathsToDelete.push(join(process.cwd(), 'static', row.path));
			}

			// Size variants — stored the same way in the sizes JSON object
			if (row.sizes && typeof row.sizes === 'object') {
				for (const sizePath of Object.values(row.sizes as Record<string, string>)) {
					if (sizePath) {
						pathsToDelete.push(join(process.cwd(), 'static', sizePath));
					}
				}
			}

			for (const filePath of pathsToDelete) {
				try {
					await unlink(filePath);
				} catch {
					// File may already be missing — ignore
				}
			}
		}

		// Delete DB rows
		await db.delete(media).where(inArray(media.id, ids));

		return { deleted: ids.length };
	}
};

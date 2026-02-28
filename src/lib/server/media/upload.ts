import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { media, options } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface UploadResult {
	id: number;
	path: string;
	url: string;
	filename: string;
	mimeType: string;
	size: number;
	width: number | null;
	height: number | null;
	sizes: Record<string, string>;
}

export async function processUpload(
	file: File,
	uploadedBy: number
): Promise<UploadResult> {
	const [thumbW, thumbH, medW, largeW] = getImageSizes();

	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);
	const ext = extname(file.name).toLowerCase() || '.bin';
	const slug = nanoid(12);
	const filename = `${slug}${ext}`;

	// Year/month directory
	const now = new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const relDir = `uploads/${yyyy}/${mm}`;
	const absDir = join('static', relDir);
	mkdirSync(absDir, { recursive: true });

	const absPath = join(absDir, filename);
	writeFileSync(absPath, buffer);

	const relativePath = `${relDir}/${filename}`;
	const sizes: Record<string, string> = {};
	let width: number | null = null;
	let height: number | null = null;

	if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
		const img = sharp(buffer);
		const meta = await img.metadata();
		width = meta.width ?? null;
		height = meta.height ?? null;

		// Thumbnail (cropped square)
		const thumbFile = `${slug}-${thumbW}x${thumbH}${ext}`;
		await sharp(buffer)
			.resize(thumbW, thumbH, { fit: 'cover' })
			.toFile(join(absDir, thumbFile));
		sizes['thumbnail'] = `${relDir}/${thumbFile}`;

		// Medium
		if (width && width > medW) {
			const medFile = `${slug}-${medW}${ext}`;
			await sharp(buffer).resize(medW).toFile(join(absDir, medFile));
			sizes['medium'] = `${relDir}/${medFile}`;
		}

		// Large
		if (width && width > largeW) {
			const largeFile = `${slug}-${largeW}${ext}`;
			await sharp(buffer).resize(largeW).toFile(join(absDir, largeFile));
			sizes['large'] = `${relDir}/${largeFile}`;
		}
	}

	const [inserted] = await db
		.insert(media)
		.values({
			filename,
			originalName: file.name,
			mimeType: file.type || 'application/octet-stream',
			size: buffer.length,
			width,
			height,
			alt: basename(file.name, ext),
			caption: '',
			description: '',
			uploadedBy,
			path: relativePath,
			sizes
		})
		.returning({ id: media.id });

	return {
		id: inserted.id,
		path: relativePath,
		url: '/' + relativePath,
		filename,
		mimeType: file.type,
		size: buffer.length,
		width,
		height,
		sizes
	};
}

function getImageSizes(): [number, number, number, number] {
	const opts = db.select().from(options)
		.where(eq(options.autoload, true))
		.all();
	const map: Record<string, string> = {};
	for (const o of opts) map[o.optionName] = o.optionValue;

	return [
		Number(map['thumbnail_size_w'] ?? 150),
		Number(map['thumbnail_size_h'] ?? 150),
		Number(map['medium_size_w'] ?? 300),
		Number(map['large_size_w'] ?? 1024)
	];
}

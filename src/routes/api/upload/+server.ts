import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { processUpload } from '$lib/server/media/upload.js';
import { can } from '$lib/server/permissions/index.js';
import { logActivity } from '$lib/server/activity/index.js';

// ─── POST /api/upload ─────────────────────────────────────────────────────────
// Handle multipart file upload. Auth required (upload_files capability).
// Form field: "file" — a File object.
// Returns the created media record.

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Authentication required');
	if (!can(locals.user.role, 'upload_files')) throw error(403, 'Forbidden');

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		throw error(400, 'Invalid multipart form data');
	}

	const file = formData.get('file');
	if (!file || !(file instanceof File)) {
		throw error(400, 'No file uploaded — expected a "file" field in the form data');
	}

	if (file.size === 0) {
		throw error(400, 'Uploaded file is empty');
	}

	// 50 MB limit
	const MAX_SIZE = 50 * 1024 * 1024;
	if (file.size > MAX_SIZE) {
		throw error(413, 'File too large — maximum upload size is 50 MB');
	}

	const media = await processUpload(file, locals.user.id);

	logActivity({
		userId: locals.user.id,
		userDisplayName: locals.user.displayName,
		action: 'media_uploaded',
		objectType: 'media',
		objectId: media.id,
		objectTitle: file.name,
		details: { mimeType: file.type, size: file.size }
	}).catch(() => {});

	return json(media, { status: 201 });
};

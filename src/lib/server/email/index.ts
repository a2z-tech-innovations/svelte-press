import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

function createTransport(): nodemailer.Transporter | null {
	if (env.SMTP_HOST) {
		return nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: parseInt(env.SMTP_PORT ?? '587'),
			secure: env.SMTP_SECURE === 'true',
			auth: env.SMTP_USER
				? {
						user: env.SMTP_USER,
						pass: env.SMTP_PASS
					}
				: undefined
		});
	}
	// No SMTP configured — caller should create an ethereal test transport
	return null;
}

export async function sendEmail(opts: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
	try {
		let transport = createTransport();

		if (!transport) {
			// Dev fallback: auto-create a free ethereal.email test account
			const testAccount = await nodemailer.createTestAccount();
			transport = nodemailer.createTransport({
				host: 'smtp.ethereal.email',
				port: 587,
				secure: false,
				auth: { user: testAccount.user, pass: testAccount.pass }
			});
		}

		const from = env.SMTP_FROM ?? 'SveltePress <noreply@sveltepress.local>';
		const info = await transport.sendMail({ from, ...opts });
		const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

		if (previewUrl) {
			console.log('[Email] Preview URL:', previewUrl);
		}

		return { success: true, previewUrl: previewUrl as string | undefined };
	} catch (err) {
		console.error('[Email] Send failed:', err);
		return { success: false, error: String(err) };
	}
}

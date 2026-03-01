import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db/index.js';
import * as schema from '$lib/server/db/schema.js';
import { sendEmail } from '$lib/server/email/index.js';
import bcrypt from 'bcryptjs';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: {
			...schema,
			// Map Better Auth model names to our table variables
			user: schema.users,
			session: schema.sessions,
			account: schema.account,
			verification: schema.verification
		}
	}),

	user: {
		modelName: 'users',
		fields: {
			// BA's required "name" field → our display_name column
			name: 'displayName',
			// BA's "image" field → our "avatar" column
			image: 'avatar',
			// BA's "createdAt" → our "registered_at" column
			createdAt: 'registeredAt'
		},
		additionalFields: {
			username: { type: 'string', required: false },
			bio: { type: 'string', required: false, defaultValue: '' },
			role: { type: 'string', required: false, defaultValue: 'subscriber', input: false },
			lastLogin: { type: 'date', required: false }
		}
	},

	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30 days
		updateAge: 60 * 60 * 24, // slide expiry every day on access
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // cache session data in cookie for 5 min (avoids DB hit per request)
		}
	},

	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		autoSignIn: true,
		password: {
			// Keep bcrypt so existing password hashes work without forced resets
			hash: async (password) => bcrypt.hash(password, 10),
			verify: async ({ hash, password }) => bcrypt.compare(password, hash)
		},
		sendResetPassword: async ({ user, url }) => {
			void sendEmail({
				to: user.email,
				subject: 'Reset your SveltePress password',
				html: `
					<h2>Password Reset</h2>
					<p>Hi ${user.name},</p>
					<p>Click the link below to reset your password. This link expires in 1 hour.</p>
					<p><a href="${url}">${url}</a></p>
					<p>If you did not request this, you can safely ignore this email.</p>
				`,
				text: `Reset your SveltePress password\n\nHi ${user.name},\n\nReset your password: ${url}\n\nIf you did not request this, ignore this email.`
			});
		}
	},

	plugins: [
		twoFactor({
			issuer: 'SveltePress',
			twoFactorTable: 'twoFactor'
		}),
		// Automatically forwards BA Set-Cookie headers to SvelteKit response
		// when auth.api.* is called from form actions or load functions
		sveltekitCookies(getRequestEvent)
	],

	advanced: {
		cookies: {
			session_token: {
				// Preserve the existing cookie name so active sessions survive migration
				name: 'sp_session',
				attributes: {
					httpOnly: true,
					sameSite: 'lax',
					path: '/',
					maxAge: 60 * 60 * 24 * 30
				}
			}
		},
		database: {
			generateId: (options) => {
				// Preserve integer auto-increment IDs for users (no ID churn on existing records)
				if (options.model === 'user' || options.model === 'users') return false;
				return crypto.randomUUID();
			}
		}
	},

	basePath: '/api/auth'
});

export type Auth = typeof auth;

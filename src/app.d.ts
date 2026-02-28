import type { User } from '$lib/types/index.js';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			user: User | null;
			sessionId: string | null;
		}
		interface PageData {
			user?: User | null;
		}
	}
}

export {};

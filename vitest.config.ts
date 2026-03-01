import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve('src/lib')
		}
	},
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./tests/setup.ts'],
		include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
		// Force UTC for consistent date testing across environments
		env: { TZ: 'UTC' },
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/lib/**/*.ts'],
			exclude: [
				'src/lib/server/db/migrations/**',
				'src/lib/server/db/seed.ts',
				'src/lib/types/**'
			]
		}
	}
});

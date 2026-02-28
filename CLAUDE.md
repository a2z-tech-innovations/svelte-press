# SveltePress — CLAUDE.md

Project root: `/home/zkh/Workbench/a2ztech/svelte-press`

Feature-complete WordPress clone built with SvelteKit 2 + Svelte 5 + TypeScript.
Admin routes use `sp-*` prefix (never `wp-*`).

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | SvelteKit 2 + Svelte 5 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| Auth | Custom session table (nanoid tokens, HTTP-only cookies) |
| Images | `sharp` for thumbnail generation |
| Package manager | **pnpm** (never npm or bun) |
| Deployment | `@sveltejs/adapter-node` |

---

## Svelte 5 Rules — CRITICAL

Always use runes. Never use legacy Svelte 4 syntax.

```svelte
<!-- ✅ Correct -->
<script lang="ts">
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
  $effect(() => { console.log(count); });
</script>
{@render children()}

<!-- ❌ Wrong -->
<script lang="ts">
  export let data;           // use $props()
  let x = 0; $: y = x * 2; // use $state / $derived
</script>
<slot />                    <!-- use {@render children()} -->
```

- **Page data**: `let { data } = $props()` — do NOT destructure data into `$state` vars at the top level; use `$derived` or read from `data` directly in templates
- **Form data**: `let { data, form } = $props()`
- **`$app/state`** for routing: `import { page } from '$app/state'` → `page.url.pathname`
- **`$app/forms`** for enhancement: `import { enhance } from '$app/forms'`
- **No legacy stores** — do not import from `$app/stores`

---

## File & Import Conventions

- All imports use **`.js` extensions** even for `.ts` source files (ESM requirement)
- Path aliases: `$lib` → `src/lib`, `$themes` → `themes`, `$plugins` → `plugins`
- Server-only code lives in `src/lib/server/` — never imported from client components

```ts
// ✅ Correct imports
import { db } from '$lib/server/db/index.js';
import { posts, users } from '$lib/server/db/schema.js';
import { slugify } from '$lib/utils.js';
import type { Post, User } from '$lib/types/index.js';
import { eq, desc, count, and, or, like } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
```

---

## Database — Drizzle ORM

**Sync reads** (better-sqlite3 is synchronous):
```ts
const rows = db.select().from(posts).where(eq(posts.status, 'publish')).all();
const row  = db.select().from(posts).where(eq(posts.id, id)).get();
```

**Async writes** (use await):
```ts
const [inserted] = await db.insert(posts).values({ ... }).returning({ id: posts.id });
await db.update(posts).set({ status: 'publish' }).where(eq(posts.id, id));
await db.delete(posts).where(eq(posts.id, id));
```

**Count pattern**:
```ts
import { count } from 'drizzle-orm';
const [{ count: total }] = db.select({ count: count() }).from(posts).all();
```

**Schema location**: `src/lib/server/db/schema.ts`
**Exported tables**: `users`, `sessions`, `posts`, `terms`, `postTerms`, `comments`, `media`, `options`, `menus`, `menuItems`, `postMeta`, `userMeta`, `revisions`, `widgets`

There is NO separate `pages` table — pages are `posts` rows with `postType = 'page'`.

**Run after schema changes**:
```bash
pnpm db:generate   # generate migration
pnpm db:migrate    # apply to SQLite
pnpm db:seed       # re-seed defaults (idempotent)
```

---

## Auth

- Session cookie name: `SESSION_COOKIE` from `$lib/server/auth/index.js`
- Session duration: 30 days
- `locals.user` — `User | null` available in all server files
- `locals.sessionId` — `string | null`

Auth guard pattern for admin layout:
```ts
// +layout.server.ts
if (!locals.user) redirect(302, '/sp-login');
```

---

## Route Structure

```
src/routes/
├── +layout.svelte              # root layout (imports app.css only)
├── +page.server.ts             # redirects / → /sp-admin/dashboard
├── (auth)/                     # no admin chrome
│   ├── sp-login/
│   ├── sp-register/
│   └── sp-forgot-password/
├── (admin)/
│   └── sp-admin/               # all admin pages, auth-guarded
│       ├── +layout.server.ts   # auth guard + load siteOptions
│       ├── +layout.svelte      # dark sidebar + top admin bar
│       ├── logout/             # POST action to clear session
│       ├── dashboard/
│       ├── posts/              # list, new/, [id]/
│       ├── pages/              # list, new/, [id]/
│       ├── media/              # list, [id]/
│       ├── comments/
│       ├── categories/
│       ├── tags/
│       ├── menus/
│       ├── widgets/
│       ├── users/              # list, new/, [id]/
│       ├── themes/
│       ├── plugins/
│       ├── profile/
│       ├── revisions/[id]/
│       ├── tools/
│       └── settings/
│           ├── general/
│           ├── reading/
│           ├── writing/
│           ├── discussion/
│           ├── media/
│           └── permalinks/
├── (frontend)/                 # public theme-aware routes
│   ├── +layout.svelte          # loads active theme CSS
│   ├── +page.svelte            # blog home
│   ├── [slug]/                 # post or page
│   ├── category/[slug]/
│   ├── tag/[slug]/
│   ├── author/[username]/
│   ├── search/
│   └── [year]/[month]/
└── api/v1/                     # REST API
    ├── posts/
    ├── pages/
    ├── media/
    ├── comments/
    ├── users/
    ├── categories/
    └── tags/
```

**NEVER create** `wp-admin`, `wp-login.php`, or any `wp-*` routes.

---

## CSS Design System

All admin styles are in `src/app.css` as plain CSS classes (not Tailwind utilities).
Do not add Tailwind utility classes to admin components — use the `.sp-*` class system.

Key classes:
- Layout: `.sp-admin-wrap`, `.sp-sidebar`, `.sp-adminbar`, `.sp-main`, `.sp-content`
- Page: `.sp-page-header`, `.sp-page-title`
- Cards: `.sp-card`, `.sp-card-header`, `.sp-card-title`, `.sp-card-body`
- Buttons: `.sp-btn`, `.sp-btn-primary`, `.sp-btn-secondary`, `.sp-btn-danger`, `.sp-btn-sm`
- Tables: `.sp-table-wrap`, `.sp-table`, `.sp-row-actions`
- Status: `.sp-status-tabs`, `.sp-status-tab`, `.sp-count-badge`
- Forms: `.sp-field`, `.sp-label`, `.sp-input`, `.sp-select`, `.sp-textarea`
- Notices: `.sp-notice`, `.sp-notice-success`, `.sp-notice-error`, `.sp-notice-warning`
- Auth: `.sp-auth-wrap`, `.sp-auth-card`, `.sp-auth-header`, `.sp-auth-body`
- Editor: `.sp-editor-wrap`, `.sp-editor-topbar`, `.sp-editor-body`, `.sp-editor-main`, `.sp-editor-sidebar`
- Settings: `.sp-settings-table` (th=220px label, td=field value)
- Media: `.sp-media-grid`, `.sp-media-thumb`, `.sp-upload-zone`

Color variables (CSS custom properties in `:root`):
```
--sp-sidebar-bg: #1d2327
--sp-primary: #2271b1
--sp-primary-hover: #135e96
--sp-success: #00a32a
--sp-warning: #dba617
--sp-error: #d63638
--sp-border: #c3c4c7
--sp-text: #1d2327
--sp-text-muted: #646970
--sp-content-bg: #f0f0f1
```

---

## Plugin System

WordPress-style hooks, singleton in `src/lib/server/plugins/hooks.ts`:

```ts
import { hooks } from '$lib/server/plugins/hooks.js';

hooks.addAction('save_post', async (post) => { /* ... */ }, 10);
await hooks.doAction('save_post', post);

hooks.addFilter('the_content', async (content) => content.trim(), 10);
const filtered = await hooks.applyFilters('the_content', rawContent);
```

Plugins live in `plugins/<slug>/plugin.ts` (compiled to `plugin.js` for loading).
Plugin activation stored in `options.active_plugins` as JSON array of slugs.

---

## Theme System

Themes live in `themes/<slug>/theme.json`. Active theme stored in `options.active_theme`.

```ts
import { getActiveTheme, getThemeList, setActiveTheme } from '$lib/server/themes/index.js';
```

Three built-in themes: `default`, `minimal`, `magazine`.
Theme CSS served from `static/themes/<slug>/style.css` (copy into static/ when implementing frontend).

---

## Media Uploads

Upload handler: `src/lib/server/media/upload.ts`
- Files stored at: `static/uploads/YYYY/MM/<nanoid>.<ext>`
- Public URL: `/uploads/YYYY/MM/<nanoid>.<ext>`
- Auto-generates: thumbnail (150×150 crop), medium (300px wide), large (1024px wide)
- Sharp processes only image/* types (not SVG, not binary files)

---

## Utility Functions (`src/lib/utils.ts`)

```ts
slugify(text)          // "Hello World" → "hello-world"
truncate(text, length) // truncates with ellipsis
formatDate(date, fmt)  // formats Date with simple template
timeAgo(date)          // "3h ago", "2d ago", etc.
gravatarUrl(email, size) // MD5 gravatar URL
initials(name)         // "John Doe" → "JD"
bytesToHuman(bytes)    // 1024 → "1.0 KB"
getMediaUrl(path)      // strips static/ prefix for browser URL
```

---

## Permissions (`src/lib/server/permissions/index.ts`)

```ts
import { can, requireCap } from '$lib/server/permissions/index.js';

can(user.role, 'publish_posts')   // → boolean
requireCap(user.role, 'manage_options') // throws if not allowed
```

Roles: `admin > editor > author > contributor > subscriber`

---

## Commands

```bash
pnpm dev           # dev server on :5173
pnpm build         # production build → build/
pnpm preview       # preview production build
pnpm check         # TypeScript + Svelte type check
pnpm db:generate   # generate Drizzle migration from schema
pnpm db:migrate    # apply migrations to SQLite DB
pnpm db:seed       # seed defaults (idempotent)
pnpm db:studio     # Drizzle Studio GUI
```

Default login: **admin / password** at `http://localhost:5173/sp-login`

---

## Roadmap

### ✅ Phase 1 — Scaffold & Database (DONE)
- [x] SvelteKit + TypeScript + Tailwind CSS v4
- [x] Drizzle schema (14 tables): users, sessions, posts, terms, postTerms, comments, media, options, menus, menuItems, postMeta, userMeta, revisions, widgets
- [x] DB singleton with WAL mode + FK enforcement
- [x] Seed script (admin user, default options, Uncategorized)
- [x] All TypeScript types in `src/lib/types/index.ts`
- [x] Utility functions in `src/lib/utils.ts`

### ✅ Phase 2 — Auth & Middleware (DONE)
- [x] Session-based auth (`createSession`, `validateSession`, `deleteSession`)
- [x] `hooks.server.ts` middleware (session injection into `locals`)
- [x] Permission system (role → capabilities map)
- [x] `/sp-login` — login page + form action
- [x] `/sp-register` — register page + form action
- [x] `/sp-forgot-password` — forgot password flow

### ✅ Phase 3 — Plugin & Theme Systems (DONE)
- [x] `HookSystem` class (addAction/doAction/addFilter/applyFilters)
- [x] Plugin loader (loads active plugins from `/plugins/` at startup)
- [x] Theme loader (reads `themes/*/theme.json`, getActiveTheme)
- [x] Scheduler (auto-publishes future posts via `setInterval`)
- [x] Three built-in theme stubs: default, minimal, magazine
- [x] Two plugin stubs: seo, akismet

### ✅ Phase 4 — Admin Foundation (DONE)
- [x] Admin layout (`+layout.svelte`) — dark sidebar, top bar, user menu, logout
- [x] Auth guard in `+layout.server.ts`
- [x] Dashboard — at-a-glance stats, quick draft widget, recent activity

### 🔄 Phase 5 — Content Management (IN PROGRESS)
- [x] Posts list (`/sp-admin/posts`)
- [x] Post editor — new (`/sp-admin/posts/new`)
- [x] Post editor — edit (`/sp-admin/posts/[id]`)
- [x] Pages list (`/sp-admin/pages`)
- [x] Page editor — new + edit
- [ ] Block editor (real Gutenberg-style implementation) — **Phase 5b**
- [ ] Media library (`/sp-admin/media`)
- [ ] Media attachment detail (`/sp-admin/media/[id]`)
- [ ] Media upload API (`/api/upload`)
- [ ] Comments moderation (`/sp-admin/comments`)
- [ ] Categories (`/sp-admin/categories`)
- [ ] Tags (`/sp-admin/tags`)
- [ ] Revisions viewer (`/sp-admin/revisions/[id]`)

### 🔄 Phase 6 — Site Management (IN PROGRESS)
- [ ] Users list (`/sp-admin/users`)
- [ ] User new/edit (`/sp-admin/users/new`, `/sp-admin/users/[id]`)
- [ ] Profile page (`/sp-admin/profile`)
- [ ] Navigation menus builder (`/sp-admin/menus`)
- [ ] Widgets admin (`/sp-admin/widgets`)
- [ ] Themes admin (`/sp-admin/themes`)
- [ ] Plugins admin (`/sp-admin/plugins`)
- [ ] Tools — import/export WXR (`/sp-admin/tools`)
- [ ] Settings: General, Reading, Writing, Discussion, Media, Permalinks

### ⬜ Phase 7 — Block Editor (NOT STARTED)
The block editor is currently a placeholder div. Implement as Svelte 5 components:
- Block types: paragraph, heading (H1-H6), image, gallery, video, quote, pullquote, code, preformatted, list (ordered/unordered), separator, spacer, table, columns, button, embed, html, shortcode
- `BlockEditor.svelte` — orchestrator with $state blocks array
- `BlockToolbar.svelte` — floating toolbar (move up/down, delete, transform)
- `BlockInserter.svelte` — `/` slash command or `+` button to pick block type
- Each block: contenteditable or custom input, attrs panel in right sidebar
- Block data: `{ id: nanoid(), type: BlockType, content: string, attrs: Record<string,unknown>, innerBlocks?: Block[] }`
- Persisted as JSON in `posts.content`

### ⬜ Phase 8 — Public Frontend (NOT STARTED)
Theme-aware public routes in `(frontend)/`:
- Blog home (paginated post list)
- Single post view (block renderer — each block type rendered as HTML)
- Static page view
- Category / Tag / Author / Date archives
- Search results
- 404 page
- RSS feed (`/feed`)
- Frontend layout loads active theme CSS + menus + widgets
- Three full theme implementations (default, minimal, magazine)

### ⬜ Phase 9 — REST API (NOT STARTED)
`/api/v1/*` endpoints:
- `GET/POST /api/v1/posts`
- `GET/PUT/DELETE /api/v1/posts/[id]`
- `GET/POST /api/v1/pages`
- `GET/POST /api/v1/media`
- `GET/POST /api/v1/comments`
- `GET /api/v1/users`
- `GET /api/v1/categories`
- `GET /api/v1/tags`
- API key auth via `options.api_key`

### ⬜ Phase 10 — Polish & Production (NOT STARTED)
- [ ] Real email sending for password reset (nodemailer or similar)
- [ ] Plugin system: compile `plugin.ts` → `plugin.js` on activation
- [ ] Full WXR import/export
- [ ] Gravatar + custom avatar upload
- [ ] Comment threading in frontend
- [ ] Sitemap (`/sitemap.xml`)
- [ ] Post scheduling UI (datetime picker)
- [ ] Bulk media operations
- [ ] Admin color schemes (6 WP schemes)
- [ ] Mobile-responsive admin sidebar
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection on all forms

---

## Known Issues / Do Not Break

1. **Route naming**: All admin URLs are `/sp-admin/...`. Never `/wp-admin/...`.
2. **No `pages` table**: Pages are `posts` rows with `postType = 'page'`.
3. **Drizzle sync reads**: `.all()` and `.get()` are synchronous — do NOT `await` them.
4. **Drizzle async writes**: `insert`/`update`/`delete` must be `await`ed.
5. **ESM imports**: Always use `.js` extension even on TypeScript source files.
6. **Layout actions**: `+layout.server.ts` cannot export `actions` in SvelteKit — put actions in `+page.server.ts` files or dedicated routes (e.g., `/sp-admin/logout`).
7. **`$props()` typing**: Use destructured assignment with type annotation: `let { data }: { data: PageData } = $props()` — not `$props<{ data: PageData }>()`.
8. **Directory names**: SvelteKit route directories use literal `(group)` and `[param]` characters. Never create them with shell escaping — use Python's `os.makedirs()` or quote carefully.
9. **Tailwind v4**: No `tailwind.config.ts` needed. `@import 'tailwindcss'` in `app.css` is the entry point. `@tailwindcss/vite` plugin in `vite.config.ts`.
10. **native modules**: `better-sqlite3` and `sharp` require `pnpm rebuild` after fresh install. Both listed in `pnpm.onlyBuiltDependencies`.

# SveltePress — CLAUDE.md

Project root: `/home/zkh/Workbench/a2ztech/svelte-press`
License: MIT — Copyright A to Z Tech Innovations LLC (https://a2ztech.io)

WordPress clone built with SvelteKit 2 + Svelte 5 + TypeScript. Version: **0.9.0-beta**.
Admin routes use `sp-*` prefix (never `wp-*`).

Git repo on `master`

**Commit style:** Never add `Co-Authored-By: Claude` or any AI attribution to commit messages.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | SvelteKit 2 + Svelte 5 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| Auth | Better Auth v1.5 (`better-auth`) — drizzle adapter, twoFactor plugin |
| Images | `sharp` for thumbnail generation |
| Email | `nodemailer` (ethereal.email in dev, real SMTP via env vars in prod) |
| Editor | Tiptap 3 (`@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/html`) |
| Forms | `sveltekit-superforms` 2.x + Zod 4 — use `zod4` adapter from `'sveltekit-superforms/adapters'` |
| Testing | Vitest + @testing-library/svelte + happy-dom |
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

- **Page data**: `import type { PageData, ActionData } from './$types.js'` → `let { data, form }: { data: PageData; form?: ActionData } = $props()`
- **Never** use `$props<T>()` generic syntax — TypeScript annotation on the destructure only
- **Layout children**: `import type { Snippet } from 'svelte'` → `children: Snippet`
- **`$app/state`** for routing: `import { page } from '$app/state'` → `page.url.pathname`
- **`$app/forms`** for enhancement: `import { enhance } from '$app/forms'`
- **No legacy stores** — do not import from `$app/stores`

### contenteditable blocks — CRITICAL pattern

All editable block components (Paragraph, Heading, Quote, Pullquote, Button) use this pattern to prevent re-render/duplication bugs:

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import type { Block } from '$lib/types/index.js';

  let { block, onupdate }: { block: Block; onupdate: (block: Block) => void } = $props();

  // localContent only syncs from props when block.id changes (different block selected)
  // NOT on every keypress — prevents cursor reset and content duplication
  let localContent = $state((block.content ?? '').replace(/<!--[\s\S]*?-->/g, ''));
  let prevId = $state(block.id);

  $effect(() => {
    const id = block.id;
    if (id !== prevId) {
      prevId = id;
      localContent = untrack(() => (block.content ?? '').replace(/<!--[\s\S]*?-->/g, ''));
    }
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLElement;
    const clean = target.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
    onupdate({ ...block, content: clean });
  }
</script>

<div contenteditable="true" oninput={handleInput}>{@html localContent}</div>
```

**Never** put `{@html block.content}` directly in a contenteditable — it re-renders on every prop change.
HTML comment stripping (`replace(/<!--[\s\S]*?-->/g, '')`) is required in all three places to prevent Svelte anchor nodes accumulating in stored content.

---

## File & Import Conventions

- All imports use **`.js` extensions** even for `.ts` source files (ESM requirement)
- Path aliases: `$lib` → `src/lib`
- Server-only code lives in `src/lib/server/` — never imported from client components
- Node.js built-ins (`crypto`, `fs`, etc.) must only be used in server files (`+page.server.ts`, `+server.ts`, `src/lib/server/**`)

```ts
// ✅ Correct imports
import { db } from '$lib/server/db/index.js';
import { posts, users } from '$lib/server/db/schema.js';
import { slugify } from '$lib/utils.js';
import type { Post, User } from '$lib/types/index.js';
import { eq, desc, count, and, or, like, gte, lt, sql } from 'drizzle-orm';
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

**Multiple WHERE conditions** — always use `and()`, never chain `.where()`:
```ts
// ✅ Correct
.where(and(eq(posts.postType, 'post'), eq(posts.status, 'publish')))

// ❌ Wrong — second .where() silently overwrites the first
.where(eq(posts.postType, 'post')).where(eq(posts.status, 'publish'))
```

**Count pattern**:
```ts
import { count } from 'drizzle-orm';
const [{ count: total }] = db.select({ count: count() }).from(posts).all();
```

**Raw SQL** (for SQLite-specific functions like strftime):
```ts
import { sql } from 'drizzle-orm';
const rows = db.all<{ year: string; month: string; count: number }>(sql`
  SELECT strftime('%Y', post_date) as year, strftime('%m', post_date) as month, COUNT(*) as count
  FROM posts WHERE status = 'publish' GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 12
`);
```

**Schema location**: `src/lib/server/db/schema.ts`
**Exported tables**: `users`, `sessions`, `posts`, `terms`, `postTerms`, `comments`, `media`, `options`, `menus`, `menuItems`, `postMeta`, `userMeta`, `revisions`, `widgets`, `account`, `verification`, `twoFactor`, `forms`, `formSubmissions`

There is NO separate `pages` table — pages are `posts` rows with `postType = 'page'`.

**Run after schema changes**:
```bash
pnpm db:generate   # generate migration
pnpm db:migrate    # apply to SQLite
pnpm db:seed       # re-seed defaults (idempotent)
```

---

## Auth

Auth is handled by **Better Auth** v1.5. Config at `src/lib/auth.ts`. Client helper at `src/lib/auth-client.ts`.

- Session cookie name: `sp_session` (HTTP-only, 30-day expiry)
- `locals.user` — `User | null` populated in `hooks.server.ts` via `auth.api.getSession()`
- `locals.sessionId` — `string | null` (the session token)
- Login: `auth.api.signInEmail` (accepts username-or-email lookup first, then passes email to BA)
- Register: `auth.api.signUpEmail` + follow-up DB patch for `username` / `role`
- Password reset: `auth.api.forgetPassword` / `auth.api.resetPassword`
- 2FA: `twoFactor` plugin — `auth.api.verifyTOTP` / `auth.api.verifyBackupCode`
- Logout: `auth.api.signOut`
- **`BETTER_AUTH_SECRET`** env var must be set; used for session signing and TOTP secret encryption
- **Do NOT** import from `$lib/server/auth/index.js` — that file no longer exists

Auth guard pattern for admin layout (unchanged):
```ts
// +layout.server.ts
if (!locals.user) redirect(302, '/sp-login');
```

2FA login flow:
1. `signInEmail` returns `{ twoFactorRedirect: true }` → set `sp_2fa_pending` cookie → redirect to `?step=2fa`
2. User enters code → `verify2faLogin` action → `auth.api.verifyTOTP` (falls back to `verifyBackupCode`)
3. Success → delete `sp_2fa_pending` cookie → redirect to dashboard

**SvelteKit `redirect()` inside `try/catch`**: always re-throw with `isRedirect(e)`:
```ts
import { fail, redirect, isRedirect } from '@sveltejs/kit';
// ...
} catch (e) {
  if (isRedirect(e)) throw e;
  return fail(400, { error: 'Invalid credentials.' });
}
```

---

## REST API Auth

All write endpoints use `requireAuth` / `requireCapability` from `$lib/server/api/auth.js`:

```ts
import { requireCapability } from '$lib/server/api/auth.js';

export const POST: RequestHandler = async (event) => {
  const authError = requireCapability(event, 'edit_posts');
  if (authError) return authError; // returns 401 or 403 Response
  // ...
};
```

GET endpoints remain public. Comments POST allows unauthenticated guests (pending status).

---

## Email

Email service at `src/lib/server/email/index.ts`:

```ts
import { sendEmail } from '$lib/server/email/index.js';

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
});
// result.previewUrl — set in dev (ethereal.email), undefined in prod
```

- **Dev** (no `SMTP_HOST`): auto-creates ethereal.email test account, logs preview URL to console
- **Prod**: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `.env`
- Email failures are caught and returned — never throw from `sendEmail`

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

Plugins live in `plugins/<slug>/plugin.ts`.
Active plugins stored in `options.active_plugins` as JSON array of slugs.
Loader reads `active_plugins` at server startup and only loads active plugins.
Default: all discovered plugins on disk are active on fresh install.

---

## Theme System

Themes live in `themes/<slug>/`. Each theme has:
- `theme.json` — metadata (name, version, description, author, screenshot)
- `style.css` — CSS custom properties defining the theme's visual variables

Active theme stored in `options.active_theme`. Frontend layout dynamically loads:
`<link rel="stylesheet" href="/themes/<slug>/style.css">` served by `src/routes/themes/[theme]/style.css/+server.ts`.

```ts
import { getActiveTheme, getThemeList, setActiveTheme, getActiveThemeStyleUrl } from '$lib/server/themes/index.js';
```

Three built-in themes: `default` (clean Georgia serif), `minimal` (monospace, narrow), `magazine` (Impact headings, red accent, wide).

Frontend layout uses `var(--theme-*)` CSS custom properties — switching themes changes fonts, colors, and layout width immediately.

---

## Date Archives

Route: `src/routes/(frontend)/[year=year]/[month=month]/`
Param matchers in `src/params/year.ts` (4-digit), `src/params/month.ts` (1-12), and `src/params/day.ts` (1-31) prevent conflicts with `[slug]`.
Archive months shown in sidebar Archives widget (queried in frontend layout load).

Additional permalink routes:
- `[year=year]/[month=month]/[slug]/` — month+name structure
- `[year=year]/[month=month]/[day=day]/[slug]/` — day+name structure
- `archives/[id]/` — numeric structure

`getPermalinkUrl(post, structure)` in `src/lib/utils.ts` generates canonical URLs. All listing pages call it. The `[slug]/+page.server.ts` issues a 301 redirect to the canonical URL for posts when using a non-postname structure.

---

## Activity Log

`src/lib/server/activity/index.ts` exports `logActivity(opts)`:
```ts
logActivity({
  userId: locals.user?.id,
  userDisplayName: locals.user?.displayName,
  action: 'post_published',   // string
  objectType: 'post',         // 'post' | 'page' | 'media' | 'comment' | 'user' | 'plugin' | 'settings' | ...
  objectId: id,               // optional
  objectTitle: title,         // optional
  details: { status }         // optional JSON
}).catch(() => {});           // always fire-and-forget
```
DB table: `activity_log` with columns `id, userId, userDisplayName, action, objectType, objectId, objectTitle, details, ip, createdAt`.
Admin page at `/sp-admin/activity` — filterable by action/type, 50 rows per page, color-coded badges.

---

## Trash / Restore Pre-Status Pattern

Before trashing a post or page, save its current status to `post_meta` so restore can return it to the original status (not hardcode `'draft'`):

```ts
// Trash: save pre-trash status
const existing = db.select().from(postMeta).where(and(eq(postMeta.postId, id), eq(postMeta.metaKey, '_trash_status'))).get();
if (existing) {
  await db.update(postMeta).set({ metaValue: currentStatus }).where(eq(postMeta.id, existing.id));
} else {
  await db.insert(postMeta).values({ postId: id, metaKey: '_trash_status', metaValue: currentStatus });
}
await db.update(posts).set({ status: 'trash' }).where(eq(posts.id, id));

// Restore: read pre-trash status and delete meta
const meta = db.select().from(postMeta).where(and(eq(postMeta.postId, id), eq(postMeta.metaKey, '_trash_status'))).get();
const restoreStatus = (meta?.metaValue as 'publish' | 'draft' | 'pending' | 'private') ?? 'draft';
await db.update(posts).set({ status: restoreStatus }).where(eq(posts.id, id));
if (meta) await db.delete(postMeta).where(eq(postMeta.id, meta.id));
```

Applied in: `posts/+page.server.ts` (bulk + single), `pages/+page.server.ts` (bulk + single).

---

## Tiptap Editor

Content stored as Tiptap JSON (`{ type: 'doc', content: [...] }`). Legacy posts (old `Block[]` format) render via `renderBlocks()`.

**Key files:**
- `src/lib/editor/use-editor.svelte.ts` — `useEditor()` wraps `new Editor(...)` in `$state`; returns `{ get editor() }` getter (must access as `editorHook.editor`, NOT destructured — destructuring loses reactivity)
- `src/lib/editor/SvelteNodeViewRenderer.svelte.ts` — mounts Svelte 5 components as ProseMirror node views; must be `.svelte.ts` (uses `$state` rune)
- `src/lib/editor/extensions/index.ts` — `getExtensions()` returns all extensions; safe for SSR and tests (no Svelte imports)
- `src/lib/editor/extensions/with-node-views.svelte.ts` — `*WithView` exports attach Svelte node view components; browser-only; imported only from `TiptapEditor.svelte`
- `src/lib/editor/backward-compat.ts` — `isTiptapDoc()` / `isLegacyBlocks()` / `parseContent()`
- `src/lib/editor/html-export.ts` — `tiptapToHtml(doc)` uses `generateHTML` from `@tiptap/html` (works in Node.js SSR; `@tiptap/core`'s `generateHTML` requires DOM — do NOT use it server-side)
- `src/lib/components/editor/TiptapEditor.svelte` — main editor component
- `src/lib/components/editor/BlockInserterMenu.svelte` — block inserter; uses `insertContentAt(editor.state.selection.to, ...)` via `ins()` helper for all atom/block inserts to avoid replacing a selected atom node

**Tiptap version: 3.x** (StarterKit 3 already includes Link, Underline, UndoRedo — do NOT add them separately)

**Publish button / form status pattern** — Svelte 5 batches `$state` microtasks; use `use:enhance` `formData` injection with `data-submit-status` attributes on buttons, not a hidden `<input>` bound to `$state`.

**Frontend rendering** (`[slug]/+page.svelte`):
```ts
import { isTiptapDoc, isLegacyBlocks } from '$lib/editor/backward-compat.js';
import { tiptapToHtml } from '$lib/editor/html-export.js';
// isTiptapDoc → split-content rendering (see Form Builder section)
// isLegacyBlocks → renderBlocks(content)
```

When a post contains Form blocks, the page uses **split-content rendering** — iterates Tiptap doc nodes, renders non-form nodes as HTML chunks via `tiptapToHtml`, and interleaves `<FormRenderer>` components for form nodes. The `load()` function pre-loads form configs and creates superform validators. See `src/routes/(frontend)/[slug]/+page.server.ts` and `+page.svelte`.

---

## oEmbed

Server endpoint: `GET /api/oembed?url=<encoded-url>`
Supports: YouTube, Vimeo, Twitter/X, SoundCloud, Spotify, Instagram, TikTok.
Returns oEmbed JSON or `{ error }` with appropriate HTTP status.
EmbedBlock stores `embedHtml` in node attrs after fetch. Frontend renders stored HTML.

---

## Slug Auto-Generation (Post/Page Editor)

The `$effect` for slug must use a `slugManuallyEdited` flag so it always tracks the full title:

```ts
let slug = $state('');
let slugManuallyEdited = $state(false);

$effect(() => {
  if (title && !slugManuallyEdited) {
    slug = slugify(title);
  }
});
// Slug input: oninput={() => { slugManuallyEdited = true; }}
```

**Never** use `if (title && !slug)` — it fires on the first character and then never updates.

---

## Route Structure

```
src/routes/
├── +layout.svelte              # root layout (imports app.css only)
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
│       ├── form-submissions/   # list with status tabs + filter; [id]/ detail view
│       ├── categories/
│       ├── tags/
│       ├── menus/
│       ├── widgets/
│       ├── users/              # list, new/, [id]/
│       ├── themes/
│       ├── plugins/
│       ├── profile/
│       ├── activity/           # admin audit log (paginated, filterable)
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
│   ├── +layout.svelte          # injects active theme CSS link; reads template for full-width
│   ├── +page.svelte            # homepage: static front page OR blog listing
│   ├── blog/                   # /blog — post listing (when static front page is active)
│   ├── [slug]/                 # post or page (+ password gate for private posts)
│   ├── [year=year]/[month=month]/          # date archives
│   ├── [year=year]/[month=month]/[slug]/   # month+name permalink structure
│   ├── [year=year]/[month=month]/[day=day]/[slug]/  # day+name permalink structure
│   ├── archives/[id]/          # numeric permalink structure
│   ├── category/[slug]/
│   ├── tag/[slug]/
│   ├── author/[username]/
│   └── search/
├── api/
│   ├── v1/posts/, v1/posts/[id]/           # collection + single CRUD
│   ├── v1/pages/, v1/pages/[id]/
│   ├── v1/media/, v1/media/[id]/
│   ├── v1/comments/, v1/comments/[id]/
│   ├── v1/users/, v1/users/[id]/
│   ├── v1/categories/, v1/categories/[id]/
│   ├── v1/tags/, v1/tags/[id]/
│   ├── v1/forms/, v1/forms/[id]/           # form CRUD (auth-guarded writes)
│   ├── v1/form-submissions/                # GET (paginated, CSV export); POST (public submit)
│   ├── upload/                 # multipart file upload
│   └── oembed/                 # oEmbed proxy endpoint
└── themes/[theme]/style.css/   # serves theme CSS from filesystem
```

**NEVER create** `wp-admin`, `wp-login.php`, or any `wp-*` routes.
**NOTE**: The root `/` is owned by `(frontend)/+page.svelte`. There is no `src/routes/+page.server.ts`.

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

Theme CSS variables (set by active theme's `style.css`):
```
--theme-font-body, --theme-font-heading
--theme-color-bg, --theme-color-surface, --theme-color-text, --theme-color-muted
--theme-color-accent, --theme-color-border
--theme-max-width, --theme-sidebar-width
--theme-header-bg, --theme-header-text, --theme-header-border   (optional, fall back to defaults)
--theme-footer-bg, --theme-footer-text                          (optional, fall back to defaults)
```

---

## Gravatar / Avatar Pattern

Gravatar computation must be server-side only (Node.js `crypto` is not available in browser):

```ts
// ✅ In +page.server.ts — use Node.js crypto
import { createHash } from 'crypto';
function gravatar(email: string, size = 48): string {
  const hash = createHash('md5').update((email ?? '').trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}
// Return avatarUrl in load() return value, use it in .svelte template
```

Do NOT call `gravatarUrl()` from `$lib/utils.ts` in client components — it uses Web Crypto async which doesn't match server MD5.

---

## Media Uploads

Upload handler: `src/lib/server/media/upload.ts`
- Files stored at: `static/uploads/YYYY/MM/<nanoid>.<ext>`
- Public URL: `/uploads/YYYY/MM/<nanoid>.<ext>`
- Auto-generates: thumbnail (150×150 crop), medium (300px wide), large (1024px wide)
- Sharp processes only `image/*` types (not SVG, not binary files)

---

## Utility Functions (`src/lib/utils.ts`)

```ts
slugify(text)          // "Hello World" → "hello-world"
truncate(text, length) // truncates with ellipsis
formatDate(date, fmt)  // formats Date with date-fns
timeAgo(date)          // "3h ago", "2d ago", etc.
gravatarUrl(email, size) // async, uses Web Crypto — SERVER SIDE ONLY via utils
initials(name)         // "John Doe" → "JD"
bytesToHuman(bytes)    // 1024 → "1.0 KB"
getMediaUrl(path)      // strips static/ prefix for browser URL
getPermalinkUrl(post, structure) // generates canonical URL based on permalink structure
// post: { id, slug, postDate }; structure: e.g. '/%postname%/', '/%year%/%monthnum%/%postname%/'
```

**`src/lib/server/render-content.ts`** — SSR-safe Tiptap content renderer:
```ts
import { renderTiptapContent } from '$lib/server/render-content.js';
// Walks doc nodes; injects html nodes as raw HTML; skips form nodes; passes rest through tiptapToHtml
const html = renderTiptapContent(tiptapDoc);
```

---

## Permissions (`src/lib/server/permissions/index.ts`)

```ts
import { can, requireCap } from '$lib/server/permissions/index.js';

can(user.role, 'publish_posts')   // → boolean
requireCap(user.role, 'manage_options') // throws if not allowed
```

Roles: `admin > editor > author > contributor > subscriber`

REST API uses `requireCapability(event, cap)` from `$lib/server/api/auth.js` which returns a Response (not throws).

---

## Commands

```bash
pnpm dev           # dev server on :5173
pnpm build         # production build → build/
pnpm preview       # preview production build
pnpm check         # TypeScript + Svelte type check
pnpm test          # run unit tests (Vitest) — 398 tests
pnpm test:watch    # run tests in watch mode
pnpm test:coverage # run tests with v8 coverage report
pnpm db:generate   # generate Drizzle migration from schema
pnpm db:migrate    # apply migrations to SQLite DB
pnpm db:seed       # seed defaults (idempotent)
pnpm db:studio     # Drizzle Studio GUI
pnpm tsx scripts/migrate-to-better-auth.ts  # one-time migration for existing DBs
```

Default login: **admin / password** at `http://localhost:5173/sp-login`

---

## Current Status — What's Done ✅

All features are complete and working end-to-end:

- **Auth** — Better Auth v1.5: login (username or email), register, forgot-password with token-based reset (sends real email), session middleware; cookie name `sp_session` preserved
- **Two-factor authentication** — TOTP setup via QR code, backup codes, enable/disable from profile; 2FA step on login via BA `twoFactor` plugin
- **Admin layout** — dark sidebar, adminbar, all nav, logout
- **Dashboard** — stats, quick draft, recent activity, welcome panel
- **Posts & Pages CRUD** — list, new, edit (with Tiptap editor), trash/restore (preserves pre-trash status), visibility selector
- **Scheduled posts** — `status='future'`; "Scheduled" tab in admin list; node-cron auto-publishes every minute
- **Tiptap editor** — ProseMirror-based, 22 block types, toolbar, block inserter, Svelte 5 node views; content stored as Tiptap JSON; backward-compatible rendering for legacy Block[] posts
- **HTML block rendering** — `renderTiptapContent()` in `src/lib/server/render-content.ts` walks doc nodes and injects `html` node `rawHtml` directly (bypasses `generateHTML` which cannot inject innerHTML from node attributes)
- **Columns block** — two-column layout with full nested block support per column (no recursive columns)
- **Embed block** — oEmbed fetch via `/api/oembed` for YouTube, Vimeo, Twitter/X, SoundCloud, Spotify, Instagram, TikTok
- **Gallery block** — multi-image grid with full-screen lightbox via event delegation
- **Password-protected posts** — frontend password gate for `status='private'` posts; 24-hour unlock cookie
- **Permalink enforcement** — six URL structures fully enforced; `getPermalinkUrl()` on all listing pages; 301 redirects for non-postname structures; routes: `/archives/[id]`, `/[year]/[month]/[slug]`, `/[year]/[month]/[day]/[slug]`
- **Media library** — grid/list, drag-and-drop upload, attachment detail/edit, sharp resizing, **bulk delete** (disk + DB)
- **Comments** — moderation table, status tabs, approve/spam/trash bulk actions, threaded display with Reply UI on frontend
- **Comment notifications** — post author emailed on new comment (fire-and-forget, dev uses ethereal preview)
- **Categories & Tags** — split-panel add/edit/delete
- **Users** — list with role tabs, new/edit, role management, **custom avatar upload** (sharp 96×96 WebP)
- **Settings** — all 6 settings pages (general, reading, writing, discussion, media, permalinks)
- **Menus builder** — tab panels for pages/posts/custom links/categories, up/down reorder; **location assignment persists** to DB and renders correct menu per theme location on frontend
- **Widgets** — areas, available widgets, **drag-and-drop reorder persisted** per area
- **Themes admin** — card grid, activate, details modal; **frontend loads per-theme CSS** (default/minimal/magazine); header/footer use `--theme-header-*` / `--theme-footer-*` CSS vars with fallbacks
- **Plugins admin** — table, toggle activate/deactivate; **activation state persisted** in options table and respected at load
- **Profile** — name, bio, contact, password, avatar upload, 2FA setup/disable
- **Activity log** — `activity_log` DB table; `logActivity()` helper called from 16+ server files; `/sp-admin/activity` with filters and pagination
- **Revisions** — slider, side-by-side diff, restore
- **Tools** — WXR export and import
- **Static front page** — Reading Settings `show_on_front`/`page_on_front` respected on `/`; falls back to blog listing if page is unpublished
- **`/blog` route** — dedicated paginated post listing always available; used when static front page is active
- **Page templates** — `template` DB column wired to frontend layout; Full Width and Blank templates hide the sidebar via `fp-wrap--full` CSS class
- **Public frontend** — blog home, single post/page, category, tag, author, search, date archives (`/[year]/[month]/`), permalink-aware URLs
- **REST API** — full CRUD at `/api/v1/` for posts, pages, media, comments, users, categories, tags, forms, form-submissions, upload; **all write endpoints auth-guarded**; individual `[id]` routes for all resource types (GET/PUT/DELETE)
- **Form Builder** — `FormBlock` Tiptap extension (atom node), 3-tab node view (Fields/Settings/Preview), 12 field types with drag-and-drop reorder; `syncFormToDb()` called on every post/page save; `FormRenderer.svelte` for frontend; admin submissions inbox at `/sp-admin/form-submissions`; CSV export; spam honeypot; optional email notification per form

---

## Known Issues / Bugs

None.

## Remaining Incomplete Features

- **Akismet / spam filtering** — plugin stub exists but makes no real API calls
- **Import validation** — WXR import does not check for duplicate slugs or missing authors
- **Multisite** — single-site only

---

## Form Builder

### DB Tables (`src/lib/server/db/schema.ts`)
- `forms` — `id`, `nodeId` (unique nanoid), `postId` FK, `title`, `fields` (JSON), `settings` (JSON), `createdAt`, `updatedAt`
- `formSubmissions` — `id`, `formId` FK (cascade delete), `data` (JSON), `ipAddress`, `userAgent`, `status` enum (`unread|read|spam|trash`), `createdAt`

### Types (`src/lib/types/index.ts`)
`FormFieldType` (12 types: `text|email|textarea|select|checkbox|radio|number|phone|url|date|file|hidden`), `FormField`, `FormSettings`, `FormConfig`

### Server Utilities (`src/lib/server/forms/index.ts`)
- `generateZodSchema(fields)` — builds Zod object schema dynamically; always includes `_honeypot` field (max 0 chars)
- `syncFormToDb(postId, nodeId, title, fields, settings)` — upsert form config (called on every post/page save)
- `getFormByNodeId(nodeId)` / `getFormById(id)` — lookup helpers
- `buildCsv(submissions, fields)` — generates CSV string with proper escaping

### Zod / Superforms
- Zod version: **4.x** — use Zod 4 API (`z.string()`, `z.coerce.number()`, etc.)
- `sveltekit-superforms` adapter: **always import `zod4` from `'sveltekit-superforms/adapters'`** — NOT the plain `zod` adapter
- Honeypot field: `_honeypot` with `.max(0)` — bots that fill it receive a silent `{ success: true }` response; no DB record stored

### Tiptap Extension
- `src/lib/editor/extensions/FormBlock.ts` — `group: 'block'`, `atom: true`; attrs: `nodeId`, `title`, `fields`, `settings`
- `src/lib/components/editor/node-views/FormNodeView.svelte` — 3-tab UI: Fields (drag-and-drop field list + inline editor), Settings (submit label, success message, email notification), Preview (disabled read-only form)
- Wired in `with-node-views.svelte.ts` as `FormWithView`, `TiptapEditor.svelte` nodeViewMap, and `BlockInserterMenu.svelte` blockDefs

### Post Save Hook
All 4 save actions (`posts/new`, `posts/[id]`, `pages/new`, `pages/[id]`) scan the saved Tiptap JSON for `type: 'form'` nodes and call `syncFormToDb()` for each.

### Frontend Rendering
- `src/lib/components/frontend/FormRenderer.svelte` — accepts `config: FormConfig`, `superformData`, `submitted: boolean`; uses `superForm(superformData, { validators: zod4(schema) })`; renders fields with error display; hidden `_formNodeId` and `_honeypot` inputs
- `[slug]/+page.server.ts` — `load()` scans Tiptap doc for form nodes, pre-loads each form, creates superform validators; `submitForm` action validates, stores submission, fires optional email
- `[slug]/+page.svelte` — split-content rendering: iterates doc nodes, interleaves `{@html htmlChunk}` and `<FormRenderer>` components

### Admin Submissions UI
- `/sp-admin/form-submissions` — status tabs (All/Unread/Read/Spam/Trash) with counts; form filter dropdown; bulk actions; per-row actions (Mark Read, Spam, Trash / Restore, Delete); CSV export
- `/sp-admin/form-submissions/[id]` — full field-by-field display using form schema; status sidebar; Restore button when in trash
- **All view excludes trash** — both counts (`if (s.status !== 'trash') counts.all++`) and the query (`WHERE status != 'trash'`)
- **Nested form HTML pattern**: per-row action forms placed OUTSIDE the table with `id="sp-del-{id}"` etc. (`display:none`); bulk form is a separate standalone `<form id="sp-bulk-form">`; table buttons reference forms via `form="sp-xxx-{id}"` attribute — never nest `<form>` inside another `<form>`

### REST API
- `GET /api/v1/forms` — list all forms (auth: `manage_options`)
- `POST /api/v1/forms` — create/upsert form (auth: `edit_posts`)
- `GET/PUT/DELETE /api/v1/forms/[id]` — single form CRUD
- `GET /api/v1/form-submissions` — paginated list; `?export=csv` streams CSV; filter by `?formId=` and `?status=`
- `POST /api/v1/form-submissions` — public form submit endpoint

---

## Do Not Break

1. **Route naming**: All admin URLs are `/sp-admin/...`. Never `/wp-admin/...`.
2. **No `pages` table**: Pages are `posts` rows with `postType = 'page'`.
3. **Drizzle sync reads**: `.all()` and `.get()` are synchronous — do NOT `await` them.
4. **Drizzle async writes**: `insert`/`update`/`delete` must be `await`ed.
5. **ESM imports**: Always use `.js` extension even on TypeScript source files.
6. **Layout actions**: `+layout.server.ts` cannot export `actions` — put actions in `+page.server.ts` or dedicated routes.
7. **`$props()` typing**: `let { data }: { data: PageData } = $props()` — NOT `$props<{ data: PageData }>()`.
8. **Tailwind v4**: No `tailwind.config.ts` needed. `@import 'tailwindcss'` in `app.css`. `@tailwindcss/vite` plugin in `vite.config.ts`.
9. **Native modules**: `better-sqlite3` and `sharp` require `pnpm rebuild` after fresh install.
10. **No root page**: `src/routes/+page.server.ts` and `src/routes/+page.svelte` must NOT exist — `(frontend)/+page.svelte` owns `/`.
11. **contenteditable blocks**: Always use the `untrack()` + `localContent` pattern with HTML comment stripping. Never bind `{@html block.content}` directly.
12. **Slug effect**: Always use `slugManuallyEdited` flag in post/page editors. Never `if (title && !slug)`.
13. **Date archive routes**: `[year=year]/[month=month]` — matchers in `src/params/` are required to avoid conflicting with `[slug]`. Also `[day=day]` for day+name structure.
14. **Theme CSS**: Served from filesystem via `src/routes/themes/[theme]/style.css/+server.ts` — not from `static/`.
15. **Trash/restore pattern**: Always save pre-trash status to `post_meta._trash_status` before trashing. Restore reads and deletes this meta. Never hardcode `status: 'draft'` on restore.
16. **Permalink URLs**: All listing pages (home, category, tag, author, search, date archive) must call `getPermalinkUrl(post, data.permalinkStructure)` — never hardcode `/${post.slug}`.
17. **Activity logging**: All significant admin mutations must call `logActivity(...).catch(() => {})` — fire-and-forget, never throw.
18. **Nested forms**: The HTML spec forbids nested `<form>` elements; browsers silently ignore inner forms and `use:enhance` breaks. For per-row actions in tables (trash, restore, delete), place hidden forms OUTSIDE the table with unique IDs (`id="sp-del-{id}"`) and reference them from buttons via the `form="sp-del-{id}"` attribute. The bulk form must also be a separate `<form>` element. See `/sp-admin/form-submissions/+page.svelte` as the canonical example.
19. **Better Auth calls inside try/catch**: `redirect()` from `@sveltejs/kit` throws; always re-throw with `if (isRedirect(e)) throw e` to prevent the catch block from swallowing SvelteKit redirects.
20. **BETTER_AUTH_SECRET**: Must be consistent between `.env` and `getSecret()` fallback in `profile/+page.server.ts`. Both BA (for cookie signing) and our TOTP encryption use this value — a mismatch causes silent 2FA verification failures.
21. **Tiptap `useEditor` reactivity**: Always access the editor as `editorHook.editor` — never `const { editor } = useEditor(...)`. Destructuring extracts `null` at call time and loses the reactive getter.
22. **Tiptap `generateHTML` in SSR**: Import from `@tiptap/html`, not `@tiptap/core`. The core version uses `window.document` and crashes in Node.js.
23. **Tiptap node view extensions**: Base extensions (`src/lib/editor/extensions/*.ts`) must NOT import `.svelte` files — they're used in SSR and tests. Node view wiring lives exclusively in `with-node-views.svelte.ts`.
24. **Tiptap atom block insertion**: Always use `ins()` helper (calls `insertContentAt(editor.state.selection.to, ...)`) for atom/block inserts in `BlockInserterMenu`. Using plain `insertContent` replaces the currently selected atom node.
25. **Superforms Zod adapter**: Always import `zod4` from `'sveltekit-superforms/adapters'` — NOT `zod`. The project uses Zod 4.x; the plain `zod` adapter is for Zod 3 and will silently produce wrong validation behavior.
26. **Form submission status re-sync**: After a `use:enhance` form action updates submission status in the DB, `load()` re-runs and returns new data. Always add `$effect(() => { localState = data.someField; })` to re-sync local `$state` from the refreshed page data — otherwise the UI shows stale values.

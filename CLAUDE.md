# SveltePress — CLAUDE.md

Project root: `/home/zkh/Workbench/a2ztech/svelte-press`
License: MIT — Copyright A to Z Tech Innovations LLC (https://a2ztech.io)

Feature-complete WordPress clone built with SvelteKit 2 + Svelte 5 + TypeScript.
Admin routes use `sp-*` prefix (never `wp-*`).

Git repo on `master`

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
| Email | `nodemailer` (ethereal.email in dev, real SMTP via env vars in prod) |
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

## oEmbed

Server endpoint: `GET /api/oembed?url=<encoded-url>`
Supports: YouTube, Vimeo, Twitter/X, SoundCloud, Spotify, Instagram, TikTok.
Returns oEmbed JSON or `{ error }` with appropriate HTTP status.
EmbedBlock stores `embedHtml` in `block.attrs.embedHtml` after fetch. Frontend renders stored HTML.

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
│   ├── +layout.svelte          # injects active theme CSS link
│   ├── +page.svelte            # blog home
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
│   ├── v1/posts/, pages/, media/, comments/, users/, categories/, tags/
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
pnpm db:generate   # generate Drizzle migration from schema
pnpm db:migrate    # apply migrations to SQLite DB
pnpm db:seed       # seed defaults (idempotent)
pnpm db:studio     # Drizzle Studio GUI
```

Default login: **admin / password** at `http://localhost:5173/sp-login`

---

## Current Status — What's Done ✅

All features are complete and working end-to-end:

- **Auth** — login, register, forgot-password (sends real email via nodemailer/ethereal), session middleware
- **Two-factor authentication** — TOTP setup via QR code, backup codes, enable/disable from profile; 2FA step on login
- **Admin layout** — dark sidebar, adminbar, all nav, logout
- **Dashboard** — stats, quick draft, recent activity, welcome panel
- **Posts & Pages CRUD** — list, new, edit (with block editor), trash/restore (preserves pre-trash status), visibility selector
- **Scheduled posts** — `status='future'`; "Scheduled" tab in admin list; node-cron auto-publishes every minute
- **Block editor** — 21 block types, toolbar, inserter; contenteditable duplication bug fixed; HTML comment stripping
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
- **Menus builder** — tab panels for pages/posts/custom links/categories, up/down reorder
- **Widgets** — areas, available widgets, **drag-and-drop reorder persisted** per area
- **Themes admin** — card grid, activate, details modal; **frontend actually loads per-theme CSS** (default/minimal/magazine)
- **Plugins admin** — table, toggle activate/deactivate; **activation state persisted** in options table and respected at load
- **Profile** — name, bio, contact, password, avatar upload, 2FA setup/disable
- **Activity log** — `activity_log` DB table; `logActivity()` helper called from 16+ server files; `/sp-admin/activity` with filters and pagination
- **Revisions** — slider, side-by-side diff, restore
- **Tools** — WXR export and import
- **Public frontend** — blog home, single post/page, category, tag, author, search, date archives (`/[year]/[month]/`), permalink-aware URLs
- **REST API** — `/api/v1/` for posts, pages, media, comments, users, categories, tags, upload; **all write endpoints auth-guarded**

---

## Known Issues / Bugs

None.

## Remaining Incomplete Features

- **Akismet / spam filtering** — plugin stub exists but makes no real API calls
- **Import validation** — WXR import does not check for duplicate slugs or missing authors
- **Multisite** — single-site only

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
18. **Nested forms**: Never place a `<form>` inside the main editor save form. For secondary actions (trash, restore), add standalone `<form id="sp-trash-form">` / `<form id="sp-restore-form">` after the closing `</form>` and reference them via `form="sp-trash-form"` on the button.

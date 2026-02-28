# SveltePress — CLAUDE.md

Project root: `/home/zkh/Workbench/a2ztech/svelte-press`
License: MIT — Copyright A to Z Tech Innovations LLC (https://a2ztech.io)

Feature-complete WordPress clone built with SvelteKit 2 + Svelte 5 + TypeScript.
Admin routes use `sp-*` prefix (never `wp-*`).

Git repo initialized. Two commits on `master`:
- `a7b900a` — initial commit (full codebase)
- `3663af6` — MIT license, README, A to Z Tech branding
- `3076882` — fix domain to a2ztech.io

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
  let localContent = $state(block.content ?? '');
  let prevId = $state(block.id);

  $effect(() => {
    const id = block.id;
    if (id !== prevId) {
      prevId = id;
      localContent = untrack(() => block.content ?? '');
    }
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLElement;
    onupdate({ ...block, content: target.innerHTML });
  }
</script>

<div contenteditable="true" oninput={handleInput}>{@html localContent}</div>
```

**Never** put `{@html block.content}` directly in a contenteditable — it re-renders on every prop change.

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
│   └── search/
└── api/v1/                     # REST API
    ├── posts/, pages/, media/, comments/, users/, categories/, tags/
    └── ../upload/              # multipart file upload
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
Plugin activation stored in `options.active_plugins` as JSON array of slugs.
**Known gap**: activation state not currently respected at load time — all plugins in `plugins/` always load.

---

## Theme System

Themes live in `themes/<slug>/theme.json`. Active theme stored in `options.active_theme`.

```ts
import { getActiveTheme, getThemeList, setActiveTheme } from '$lib/server/themes/index.js';
```

Three built-in themes: `default`, `minimal`, `magazine`.
**Known gap**: frontend always uses same layout regardless of active theme — theme CSS/components not yet dynamically loaded.

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

## Current Status — What's Done ✅

All phases are complete and working end-to-end:

- **Auth** — login, register, forgot-password, session middleware
- **Admin layout** — dark sidebar, adminbar, all nav, logout
- **Dashboard** — stats, quick draft, recent activity, welcome panel
- **Posts & Pages CRUD** — list, new, edit (with block editor), trash/delete
- **Block editor** — 21 block types (paragraph, heading H1-H6, image, gallery, video, quote, pullquote, code, preformatted, list, separator, spacer, table, columns, button, embed, html, shortcode), toolbar, inserter
- **Media library** — grid/list, drag-and-drop upload, attachment detail/edit, sharp resizing
- **Comments** — moderation table, status tabs, approve/spam/trash bulk actions
- **Categories & Tags** — split-panel add/edit/delete
- **Users** — list with role tabs, new/edit, role management
- **Settings** — all 6 settings pages (general, reading, writing, discussion, media, permalinks)
- **Menus builder** — tab panels for pages/posts/custom links/categories, up/down reorder
- **Widgets** — areas + available widgets display
- **Themes admin** — card grid, activate, details modal
- **Plugins admin** — table, toggle activate/deactivate
- **Profile** — name, bio, contact, password, avatar display
- **Revisions** — slider, side-by-side diff, restore
- **Tools** — WXR export and import
- **Public frontend** — blog home, single post/page, category, tag, author, search archives
- **REST API** — /api/v1/ for posts, pages, media, comments, users, categories, tags, upload

---

## Known Issues / Bugs

1. **Visibility selector** — defaults to "Password Protected" in new post editor sidebar (cosmetic, correct status still submitted)
2. **`<!---->` in block content** — Svelte anchor comment nodes accumulate in stored HTML from `{@html}` inside contenteditable; renders invisibly but is present in DB
3. **Hydration mismatch warning** — console warning on post edit pages; no functional impact
4. **Nested form SSR warning** — `node_invalid_placement_ssr: <form>` on post edit page; no functional impact

## Incomplete Features

- **Theme frontend** — switching themes does nothing visually; all themes render same layout
- **Plugin activation** — toggle exists in admin but load always reads from filesystem, ignores activation state
- **Comment threading UI** — stored with `parentId` but frontend renders flat
- **Password-protected posts** — no frontend gate
- **Date archives** — `/[year]/[month]/` route not implemented
- **oEmbed** — Embed block stores URL only, no oEmbed fetch
- **Columns nesting** — Columns block doesn't support nested blocks
- **Email** — forgot password shows token in flash only; no SMTP
- **User avatar upload** — shows Gravatar only
- **Permalink structure** — settings saved but frontend always uses `/[slug]`
- **REST API auth** — session cookie read but write endpoints not consistently guarded
- **Media bulk delete** — checkboxes exist, action not wired

---

## Do Not Break

1. **Route naming**: All admin URLs are `/sp-admin/...`. Never `/wp-admin/...`.
2. **No `pages` table**: Pages are `posts` rows with `postType = 'page'`.
3. **Drizzle sync reads**: `.all()` and `.get()` are synchronous — do NOT `await` them.
4. **Drizzle async writes**: `insert`/`update`/`delete` must be `await`ed.
5. **ESM imports**: Always use `.js` extension even on TypeScript source files.
6. **Layout actions**: `+layout.server.ts` cannot export `actions` — put actions in `+page.server.ts` or dedicated routes (e.g., `/sp-admin/logout`).
7. **`$props()` typing**: `let { data }: { data: PageData } = $props()` — NOT `$props<{ data: PageData }>()`.
8. **Tailwind v4**: No `tailwind.config.ts` needed. `@import 'tailwindcss'` in `app.css`. `@tailwindcss/vite` plugin in `vite.config.ts`.
9. **Native modules**: `better-sqlite3` and `sharp` require `pnpm rebuild` after fresh install.
10. **No root page**: `src/routes/+page.server.ts` and `src/routes/+page.svelte` must NOT exist — `(frontend)/+page.svelte` owns `/`.
11. **contenteditable blocks**: Always use the `untrack()` + `localContent` pattern. Never bind `{@html block.content}` directly in a contenteditable.
12. **Slug effect**: Always use `slugManuallyEdited` flag in post/page editors. Never `if (title && !slug)`.

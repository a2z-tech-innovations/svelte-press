# SveltePress

> Built by [A to Z Tech Innovations LLC](https://a2ztech.io)

A full-featured, open-source WordPress clone built from scratch with SvelteKit 2, Svelte 5, TypeScript, and SQLite. Familiar WordPress-style admin, Tiptap-powered rich text editor, plugin hooks, theme switching, and a clean public frontend — with zero PHP.

**License:** MIT &nbsp;|&nbsp; **Stack:** SvelteKit 2 · Svelte 5 · TypeScript · SQLite · Drizzle ORM · Tailwind CSS v4 · Tiptap 3 · Vitest

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Default Credentials](#default-credentials)
- [Editor](#editor)
- [Admin Panel](#admin-panel)
- [Public Frontend](#public-frontend)
- [Plugin System](#plugin-system)
- [Theme System](#theme-system)
- [REST API](#rest-api)
- [Email Configuration](#email-configuration)
- [Known Issues & Incomplete Features](#known-issues--incomplete-features)
- [Contributing](#contributing)

---

## Features

### Content Management
- **Posts & Pages** — Create, edit, publish, draft, schedule, trash, and restore content; trash/restore preserves the original status
- **Tiptap editor** — ProseMirror-based rich text editor with 22 block types, floating node views, and keyboard shortcuts (see [Editor](#editor))
- **Form Builder** — Visual form builder block inside the editor; create contact/inquiry forms with 12 field types, drag-and-drop field reordering, spam honeypot; submissions stored in DB, managed in admin, exportable as CSV
- **Post revisions** — Every save creates a revision; browse and restore from a diff view
- **Scheduled publishing** — Set a future publish date; `node-cron` publishes automatically every minute; "Scheduled" tab in admin
- **Sticky posts** — Pin posts to the top of archive listings
- **Excerpts** — Manual or auto-generated post summaries
- **Slug management** — Auto-derived from title, manually overrideable
- **Featured images** — Attach media to posts/pages
- **Password-protected posts** — Set a password on private posts; frontend enforces a password gate with a 24-hour cookie unlock

### Media Library
- **Upload** — Drag-and-drop or file-picker upload via multipart POST
- **Image processing** — `sharp` auto-generates thumbnail (150×150 crop), medium (300px), and large (1024px) sizes
- **Grid & list views** — Toggle between views in the media library
- **Attachment details** — Edit alt text, caption, description; view file metadata
- **Bulk delete** — Select multiple items and delete them along with their generated size variants on disk
- **Stored at** `static/uploads/YYYY/MM/`

### Comments
- **Threaded comments** — Nested reply UI on the public frontend with indented display
- **Reply button** — Click Reply on any comment to switch the form into reply mode
- **Moderation queue** — Approve, unapprove, mark as spam, or trash comments
- **Comment status** — Per-post control (open/closed)
- **Gravatar support** — MD5-hashed email lookups for user avatars
- **Guest commenting** — Name, email, website; no account required
- **Email notifications** — Post author emailed when a new comment is submitted

### Users & Roles
- **Five roles** — Administrator, Editor, Author, Contributor, Subscriber
- **Capability system** — WordPress-faithful `CAPABILITIES` map with a `can(user, cap)` helper
- **User management** — Create, edit, delete users; assign roles
- **Profile page** — Edit display name, bio, contact info, password, avatar
- **Custom avatar upload** — Upload a profile photo (sharp-processed to 96×96 WebP); falls back to Gravatar
- **Registration** — Configurable open/closed registration via settings
- **Two-factor authentication** — TOTP-based 2FA via authenticator app; QR code setup, backup codes, enable/disable from profile

### Taxonomy
- **Categories** — Hierarchical (parent/child), with slugs and descriptions
- **Tags** — Flat taxonomy; attach multiple tags per post
- **Archive pages** — Category, tag, author, date (`/YYYY/MM/`), and search archives on the public frontend

### Navigation & Widgets
- **Menu builder** — Create menus, add pages/posts/custom links/categories, reorder, assign to theme locations
- **Widget areas** — Sidebar, Footer columns; drag-and-drop reorder with persisted order
- **Built-in widgets** — Search, Recent Posts, Recent Comments, Archives (with month links), Categories, Tag Cloud, Text, Custom HTML

### Authentication
- **Better Auth** — Session management via [better-auth](https://better-auth.com) v1.5; HTTP-only `sp_session` cookie, 30-day expiry
- **Login / Register / Forgot Password** — Full auth flow at `/sp-login`, `/sp-register`, `/sp-forgot-password`
- **Password reset email** — Token-based reset link emailed via SMTP (or ethereal.email in dev); `/sp-forgot-password?token=` handles the reset form
- **Secure password hashing** — bcryptjs (existing hashes migrate automatically)
- **Two-factor authentication** — TOTP via authenticator app with backup codes; setup QR code generated on profile page

### Permalinks
- **Six URL structures** — Plain (`?p=123`), Day+name, Month+name, Numeric (`/archives/123`), Post name, Custom
- **Enforced on all listing pages** — Home, category, tag, author, search, date archives all generate correct URLs
- **Canonical redirects** — `/[slug]` issues 301 → canonical URL when using a date-based structure

### Activity Log
- **Audit trail** — Every significant admin action (login, post save/publish/trash, media upload, settings changes, plugin activation) is recorded
- **Admin page** — Filterable, paginated log at `/sp-admin/activity` with color-coded action types

### Settings
| Page | Controls |
|---|---|
| General | Site title, tagline, admin email, registration, default role, timezone, date/time format |
| Reading | Homepage display (latest posts or static page), posts per page, feed settings |
| Writing | Default post category and format |
| Discussion | Comment notifications, moderation rules, avatar settings |
| Media | Thumbnail/medium/large pixel dimensions, upload path |
| Permalinks | URL structure (plain, day-name, month-name, numeric, post-name, custom) |

### Import / Export
- **WXR export** — Export all content, posts, or pages as WordPress eXtended RSS XML
- **WXR import** — Upload and parse a WXR file; imports posts, pages, and comments

### Developer Features
- **Plugin system** — WordPress-style `addAction` / `doAction` / `addFilter` / `applyFilters` hook API; active plugins loaded from `plugins/*/plugin.ts` at server startup; activation state persisted in DB
- **Theme system** — Themes in `themes/*/`; active theme stored in `options` table; per-theme `style.css` dynamically loaded on frontend; switch via admin UI
- **REST API** — Full CRUD at `/api/v1/*` for posts, pages, media, comments, users, categories, tags, forms, and form submissions; all write endpoints require authentication
- **oEmbed** — `/api/oembed` proxy resolves YouTube, Vimeo, Twitter/X, SoundCloud, Spotify, Instagram, TikTok embed HTML
- **Drizzle ORM** — Type-safe SQLite queries; schema migrations via `drizzle-kit`
- **Svelte 5 runes** — All state via `$state`, `$derived`, `$effect`; no legacy stores
- **Unit tests** — Vitest + @testing-library/svelte; 398 tests covering utils, permissions, route matchers, plugin hooks, API auth, post loading, session lifecycle, 2FA flows, editor extensions, form schema generation, Zod validation, CSV export, and submission flow

---

## Quick Start

**Requirements:** Node.js 18+, pnpm

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file and set BETTER_AUTH_SECRET
cp .env.example .env
# Edit .env and set BETTER_AUTH_SECRET to a random 32+ character string

# 3. Generate and run database migrations
pnpm db:generate
pnpm db:migrate

# 4. Seed the database (creates default admin, options, Uncategorized category)
pnpm db:seed

# 5. Start the dev server
pnpm dev
```

**Migrating an existing database?** Run the one-time migration script after applying migrations:

```bash
pnpm tsx scripts/migrate-to-better-auth.ts
```

This populates the `account` table with existing password hashes and migrates session tokens so active logins are preserved.

The app is now running at **http://localhost:5173**.

- Public frontend: http://localhost:5173
- Admin panel: http://localhost:5173/sp-admin/dashboard

### Production Build

```bash
pnpm build
node build/index.js
```

---

## Default Credentials

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `password` |

> **Change the default password immediately** after first login via Settings → Profile.

---

## Editor

SveltePress uses a [Tiptap 3](https://tiptap.dev) (ProseMirror-based) rich text editor. Content is stored as Tiptap JSON (`{ type: 'doc', content: [...] }`) and rendered server-side via `generateHTML` from `@tiptap/html`. Legacy posts (old block format) continue to render correctly via backward-compatible rendering.

**Toolbar** — block type picker, bold/italic/underline/strikethrough, alignment, link, inline code, undo/redo.

**Block inserter** — 22 block types across six categories:

**Text**
| Block | Description |
|---|---|
| Paragraph | Rich text with inline formatting |
| Heading | H2–H4 with level switcher |
| Quote | Blockquote |
| Pullquote | Large centered pull quote |
| Preformatted | Preserves whitespace, monospace |
| Code Block | Fenced code block |

**Lists**
| Block | Description |
|---|---|
| Bullet List | Unordered list |
| Numbered List | Ordered list |

**Media**
| Block | Description |
|---|---|
| Image | Upload or pick from media library |
| Gallery | Multi-image grid — Svelte node view with image picker |
| Video | URL input with caption — Svelte node view |
| Embed | oEmbed URL (YouTube, Vimeo, Twitter/X, SoundCloud, Spotify, Instagram, TikTok) — Svelte node view |

**Layout**
| Block | Description |
|---|---|
| Two Columns | Two-column nested editor panes |
| Separator | Horizontal rule |
| Spacer | Adjustable height — Svelte node view with drag slider |

**Advanced**
| Block | Description |
|---|---|
| Button | CTA with fill/outline style, URL, target — Svelte node view |
| Custom HTML | Raw HTML textarea — Svelte node view |
| Shortcode | Shortcode text input — Svelte node view |
| Table | Rows/columns with header row |

**Interactive**
| Block | Description |
|---|---|
| Form | Visual form builder — add/reorder/configure fields, settings (submit label, success message, email notification), live preview tab; Svelte node view |

**Node views** — Spacer, Video, Embed, Gallery, Button, HTML, Shortcode, and Form blocks render as interactive Svelte 5 components inside the editor, mounted via a custom `SvelteNodeViewRenderer`.

---

## Admin Panel

All admin routes live under `/sp-admin/`:

| Route | Description |
|---|---|
| `/sp-admin/dashboard` | At-a-glance stats, quick draft, recent activity, welcome panel |
| `/sp-admin/posts` | Post list with status tabs (including Scheduled), search, bulk actions, hover actions |
| `/sp-admin/posts/new` | Tiptap editor for new post |
| `/sp-admin/posts/[id]` | Tiptap editor for existing post |
| `/sp-admin/pages` | Same as posts, filtered to pages |
| `/sp-admin/media` | Grid/list media library, drag-and-drop upload, bulk delete |
| `/sp-admin/media/[id]` | Attachment detail and edit |
| `/sp-admin/comments` | Comment moderation with status tabs and bulk actions |
| `/sp-admin/categories` | Split-panel add/edit/delete with hierarchy |
| `/sp-admin/tags` | Flat taxonomy management |
| `/sp-admin/menus` | Menu builder with pages/posts/custom links/categories |
| `/sp-admin/widgets` | Widget area management with drag-and-drop reordering |
| `/sp-admin/users` | User list with role filter tabs |
| `/sp-admin/users/new` | Create new user |
| `/sp-admin/users/[id]` | Edit user and upload avatar |
| `/sp-admin/profile` | Current user profile, password, avatar upload, 2FA setup |
| `/sp-admin/themes` | Theme grid with activate and details modal |
| `/sp-admin/plugins` | Plugin list with activate/deactivate (state persisted) |
| `/sp-admin/settings/general` | General settings |
| `/sp-admin/settings/reading` | Reading settings |
| `/sp-admin/settings/writing` | Writing settings |
| `/sp-admin/settings/discussion` | Comment and notification settings |
| `/sp-admin/settings/media` | Image size settings |
| `/sp-admin/settings/permalinks` | URL structure settings |
| `/sp-admin/form-submissions` | Form submission inbox — status tabs (All/Unread/Read/Spam/Trash), form filter, bulk actions, CSV export |
| `/sp-admin/form-submissions/[id]` | Full submission detail with field labels, status change, restore, delete |
| `/sp-admin/activity` | Admin activity log with filters and pagination |
| `/sp-admin/tools` | WXR import and export |
| `/sp-admin/revisions/[id]` | Revision browser and restore |

---

## Public Frontend

| Route | Description |
|---|---|
| `/` | Paginated blog home |
| `/[slug]` | Single post or page with threaded comments |
| `/[slug]` (password-protected) | Password gate for private posts; unlocked via cookie |
| `/category/[slug]` | Category archive |
| `/tag/[slug]` | Tag archive |
| `/author/[username]` | Author archive with profile |
| `/search` | Full-text search results |
| `/[year]/[month]/` | Date archive (e.g. `/2026/02/`) |
| `/[year]/[month]/[slug]` | Month+name permalink structure |
| `/[year]/[month]/[day]/[slug]` | Day+name permalink structure |
| `/archives/[id]` | Numeric permalink structure |

Frontend features: header with primary nav, sidebar with widgets (search, categories, archives), footer, threaded comment form on posts, Gravatar avatars, responsive layout, active theme CSS loaded dynamically.

---

## Plugin System

Plugins live in `plugins/<name>/plugin.ts` and are loaded at server startup. Only plugins listed in the `active_plugins` option are loaded. The admin UI allows toggling activation — state is persisted in the database.

```typescript
// plugins/my-plugin/plugin.ts
import { hooks } from '$lib/server/plugins/hooks.js';

hooks.addAction('post_published', (post) => {
  console.log('Post published:', post.title);
});

hooks.addFilter('post_content', (content) => {
  return content.replace(/\[year\]/g, new Date().getFullYear().toString());
});
```

Two example plugins are included: `plugins/seo/` (meta tag injection) and `plugins/akismet/` (spam check stub).

---

## Theme System

Themes live in `themes/<name>/`. Each theme has a `theme.json` (metadata) and a `style.css` (CSS custom properties). The active theme is stored in the `options` table and switchable from the admin. Switching themes immediately changes the frontend's fonts, colors, and layout width.

Three themes ship by default:

| Theme | Description |
|---|---|
| `default` | Clean, readable — Georgia serif body, sans-serif headings, 780px width |
| `minimal` | Stark monospace — Courier New throughout, narrow 640px width |
| `magazine` | Editorial bold — Impact headings, red accent, wide 1100px layout |

```json
// themes/my-theme/theme.json
{
  "name": "My Theme",
  "version": "1.0.0",
  "description": "A custom theme",
  "author": "You",
  "screenshot": "/themes/my-theme/screenshot.png"
}
```

```css
/* themes/my-theme/style.css */
:root {
  --theme-font-body: Georgia, serif;
  --theme-font-heading: sans-serif;
  --theme-color-accent: #2271b1;
  --theme-max-width: 780px;
  --theme-sidebar-width: 280px;
}
```

---

## REST API

All endpoints at `/api/v1/` support standard CRUD. Authentication uses the same session cookie. **Write endpoints require authentication**; GET endpoints are public.

| Endpoint | Methods | Auth required |
|---|---|---|
| `/api/v1/posts` | GET, POST | POST: `edit_posts` |
| `/api/v1/pages` | GET, POST | POST: `edit_pages` |
| `/api/v1/media` | GET, PATCH, DELETE | PATCH/DELETE: `upload_files` |
| `/api/v1/comments` | GET, POST | POST: public (guest comments → pending) |
| `/api/v1/users` | GET, POST | GET+POST: `manage_users` |
| `/api/v1/categories` | GET, POST | POST: `manage_categories` |
| `/api/v1/tags` | GET, POST | POST: `manage_categories` |
| `/api/v1/forms` | GET, POST | POST: `edit_posts` |
| `/api/v1/forms/[id]` | GET, PUT, DELETE | PUT/DELETE: `edit_posts` |
| `/api/v1/form-submissions` | GET, POST | GET: `manage_options`; POST: public |
| `/api/upload` | POST | `upload_files` |
| `/api/oembed` | GET | Public |

---

## Email Configuration

In development, SveltePress automatically creates a free [ethereal.email](https://ethereal.email) test account. Email preview URLs are logged to the console — no configuration needed.

For production, set these environment variables in `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
SMTP_FROM=SveltePress <noreply@example.com>
```

Emails sent:
- **Password reset** — triggered by forgot password form
- **New comment notification** — sent to post author when a comment is submitted
- **Form submission notification** — optionally sent to a configured address when a form is submitted (enabled per-form via the Settings tab in the Form Builder)

---

## Known Issues & Incomplete Features

The project is feature-complete. The following items are intentionally out of scope for v1.

### Incomplete Features

| Feature | Status |
|---|---|
| **Akismet / spam filtering** | The Akismet plugin stub exists but makes no real API calls |
| **Import validation** | WXR import does not validate for duplicate slugs or missing authors |

### Not Yet Implemented

- **Multisite** — Single-site only

---

## Project Structure

```
svelte-press/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── editor/          # Tiptap editor components
│   │   │   │   ├── TiptapEditor.svelte
│   │   │   │   ├── TiptapToolbar.svelte
│   │   │   │   ├── BlockInserterMenu.svelte
│   │   │   │   ├── MediaPickerDialog.svelte
│   │   │   │   └── node-views/  # Svelte node view components
│   │   │   ├── blocks/          # Legacy block components (kept for reference)
│   │   │   ├── GalleryLightbox.svelte  # Full-screen gallery lightbox
│   │   │   └── Comment.svelte   # Recursive threaded comment component
│   │   ├── editor/              # Tiptap editor core
│   │   │   ├── use-editor.svelte.ts         # Svelte 5 $state hook
│   │   │   ├── SvelteNodeViewRenderer.svelte.ts  # ProseMirror node view renderer
│   │   │   ├── backward-compat.ts           # Tiptap JSON vs legacy Block[] detection
│   │   │   ├── html-export.ts               # generateHTML() wrapper (SSR-safe)
│   │   │   └── extensions/      # Custom Tiptap extensions + node views
│   │   ├── auth.ts              # Better Auth config (drizzle adapter, twoFactor plugin, bcrypt)
│   │   ├── auth-client.ts       # SvelteKit client helper (twoFactorClient plugin)
│   │   ├── server/
│   │   │   ├── activity/        # logActivity() helper + activity_log table
│   │   │   ├── api/             # REST API auth helpers
│   │   │   ├── db/              # Drizzle schema, migrations, seed
│   │   │   ├── email/           # nodemailer email service
│   │   │   ├── media/           # sharp image processing
│   │   │   ├── permissions/     # Role capabilities
│   │   │   ├── plugins/         # Hook system + loader
│   │   │   ├── scheduler/       # node-cron scheduled publishing
│   │   │   └── themes/          # Theme loader
│   │   └── utils.ts             # slugify, formatDate, truncate, getPermalinkUrl, etc.
│   ├── params/
│   │   ├── year.ts              # Route matcher for 4-digit years
│   │   ├── month.ts             # Route matcher for month numbers (1–12)
│   │   └── day.ts               # Route matcher for day numbers (1–31)
│   └── routes/
│       ├── (admin)/sp-admin/    # All admin routes
│       ├── (auth)/              # Login, register, forgot password
│       ├── (frontend)/          # Public blog routes (theme-aware)
│       ├── api/v1/              # REST API
│       ├── api/oembed/          # oEmbed proxy
│       └── themes/[theme]/      # Theme CSS file server
├── plugins/                     # Plugin directory
├── themes/                      # Theme directory (default, minimal, magazine)
├── static/uploads/              # Media upload destination
└── data/                        # SQLite database (gitignored)
```

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first.

```bash
# Run type checking
pnpm check

# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Start dev server
pnpm dev
```

**MIT License** — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by <a href="https://a2ztech.io"><strong>A to Z Tech Innovations LLC</strong></a>
</p>

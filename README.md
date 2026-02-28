# SveltePress

> Built by [A to Z Tech Innovations LLC](https://a2ztech.io)

A full-featured, open-source WordPress clone built from scratch with SvelteKit 2, Svelte 5, TypeScript, and SQLite. Familiar WordPress-style admin, Gutenberg-style block editor, plugin hooks, theme switching, and a clean public frontend — with zero PHP.

**License:** MIT &nbsp;|&nbsp; **Stack:** SvelteKit 2 · Svelte 5 · TypeScript · SQLite · Drizzle ORM · Tailwind CSS v4

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Default Credentials](#default-credentials)
- [Block Editor](#block-editor)
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
- **Posts & Pages** — Create, edit, publish, draft, schedule, trash, and restore content
- **Block editor** — Gutenberg-style editor with 21 block types (see [Block Editor](#block-editor))
- **Post revisions** — Every save creates a revision; browse and restore from a diff view
- **Scheduled publishing** — Set a future publish date; `node-cron` publishes automatically every minute
- **Sticky posts** — Pin posts to the top of archive listings
- **Excerpts** — Manual or auto-generated post summaries
- **Slug management** — Auto-derived from title, manually overrideable
- **Featured images** — Attach media to posts/pages

### Media Library
- **Upload** — Drag-and-drop or file-picker upload via multipart POST
- **Image processing** — `sharp` auto-generates thumbnail (150×150 crop), medium (300px), and large (1024px) sizes
- **Grid & list views** — Toggle between views in the media library
- **Attachment details** — Edit alt text, caption, description; view file metadata
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
- **Registration** — Configurable open/closed registration via settings

### Taxonomy
- **Categories** — Hierarchical (parent/child), with slugs and descriptions
- **Tags** — Flat taxonomy; attach multiple tags per post
- **Archive pages** — Category, tag, author, date (`/YYYY/MM/`), and search archives on the public frontend

### Navigation & Widgets
- **Menu builder** — Create menus, add pages/posts/custom links/categories, reorder, assign to theme locations
- **Widget areas** — Sidebar, Footer columns; available widget list
- **Built-in widgets** — Search, Recent Posts, Recent Comments, Archives (with month links), Categories, Tag Cloud, Text, Custom HTML

### Authentication
- **Session-based auth** — Thin custom session table (nanoid tokens, HTTP-only cookies, 30-day expiry)
- **Login / Register / Forgot Password** — Full auth flow at `/sp-login`, `/sp-register`, `/sp-forgot-password`
- **Password reset email** — Sends via SMTP (or ethereal.email in dev for preview)
- **Secure password hashing** — bcryptjs

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
- **REST API** — Full CRUD at `/api/v1/*` for posts, pages, media, comments, users, categories, tags; all write endpoints require authentication
- **oEmbed** — `/api/oembed` proxy resolves YouTube, Vimeo, Twitter/X, SoundCloud, Spotify, Instagram, TikTok embed HTML
- **Drizzle ORM** — Type-safe SQLite queries; schema migrations via `drizzle-kit`
- **Svelte 5 runes** — All state via `$state`, `$derived`, `$effect`; no legacy stores

---

## Quick Start

**Requirements:** Node.js 18+, pnpm

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Generate and run database migrations
pnpm db:generate
pnpm db:migrate

# 4. Seed the database (creates default admin, options, Uncategorized category)
pnpm db:seed

# 5. Start the dev server
pnpm dev
```

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

## Block Editor

The editor supports 21 block types across four categories:

**Text**
| Block | Description |
|---|---|
| Paragraph | Rich text with bold/italic via Ctrl+B / Ctrl+I |
| Heading | H1–H6 with level switcher toolbar |
| List | Ordered and unordered lists |
| Quote | Blockquote with optional citation |
| Pullquote | Large centered pull quote with border |
| Code | Monospace code block with language label |
| Preformatted | Preserves whitespace, monospace |
| HTML | Raw HTML passthrough |
| Shortcode | Shortcode placeholder (rendered by plugins) |

**Media**
| Block | Description |
|---|---|
| Image | Upload or select from media library; alt text, caption, size, alignment |
| Gallery | Multi-image grid with column count control |
| Video | URL embed or file reference |

**Layout**
| Block | Description |
|---|---|
| Columns | Two-column layout container |
| Separator | Horizontal rule with style variants |
| Spacer | Adjustable height whitespace |
| Table | Rows/columns editor with header toggle |

**Widgets**
| Block | Description |
|---|---|
| Button | CTA button with fill/outline style, URL, and new-tab toggle |
| Embed | oEmbed URL embed — fetches HTML from YouTube, Vimeo, Twitter/X, SoundCloud, Spotify, Instagram, TikTok |

**Block controls** (all blocks): move up/down, duplicate, delete, add block below.

---

## Admin Panel

All admin routes live under `/sp-admin/`:

| Route | Description |
|---|---|
| `/sp-admin/dashboard` | At-a-glance stats, quick draft, recent activity, welcome panel |
| `/sp-admin/posts` | Post list with status tabs, search, bulk actions, hover actions |
| `/sp-admin/posts/new` | Block editor for new post |
| `/sp-admin/posts/[id]` | Block editor for existing post |
| `/sp-admin/pages` | Same as posts, filtered to pages |
| `/sp-admin/media` | Grid/list media library, drag-and-drop upload |
| `/sp-admin/media/[id]` | Attachment detail and edit |
| `/sp-admin/comments` | Comment moderation with status tabs and bulk actions |
| `/sp-admin/categories` | Split-panel add/edit/delete with hierarchy |
| `/sp-admin/tags` | Flat taxonomy management |
| `/sp-admin/menus` | Menu builder with pages/posts/custom links/categories |
| `/sp-admin/widgets` | Widget area management |
| `/sp-admin/users` | User list with role filter tabs |
| `/sp-admin/users/new` | Create new user |
| `/sp-admin/users/[id]` | Edit user |
| `/sp-admin/profile` | Current user profile and password |
| `/sp-admin/themes` | Theme grid with activate and details modal |
| `/sp-admin/plugins` | Plugin list with activate/deactivate (state persisted) |
| `/sp-admin/settings/general` | General settings |
| `/sp-admin/settings/reading` | Reading settings |
| `/sp-admin/settings/writing` | Writing settings |
| `/sp-admin/settings/discussion` | Comment and notification settings |
| `/sp-admin/settings/media` | Image size settings |
| `/sp-admin/settings/permalinks` | URL structure settings |
| `/sp-admin/tools` | WXR import and export |
| `/sp-admin/revisions/[id]` | Revision browser and restore |

---

## Public Frontend

| Route | Description |
|---|---|
| `/` | Paginated blog home |
| `/[slug]` | Single post or page with threaded comments |
| `/category/[slug]` | Category archive |
| `/tag/[slug]` | Tag archive |
| `/author/[username]` | Author archive with profile |
| `/search` | Full-text search results |
| `/[year]/[month]/` | Date archive (e.g. `/2026/02/`) |

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

---

## Known Issues & Incomplete Features

The core content creation and management flow works end-to-end. The following items are partially implemented or have known limitations.

### Known Bugs

- **Hydration mismatch warning** — A `[svelte] hydration_mismatch` console warning appears on post edit pages. Does not affect functionality.
- **Nested form warning** — The post edit page logs a `node_invalid_placement_ssr: <form>` error. Visual behavior is unaffected.

### Incomplete Features

| Feature | Status |
|---|---|
| **Password-protected posts** | `status='private'` is stored but the frontend does not enforce a password gate |
| **Permalink structure enforcement** | Settings page saves the chosen structure but frontend always routes via `/[slug]` |
| **Columns block nesting** | Columns block renders two columns but does not support nested blocks inside each column |
| **Gallery lightbox** | Gallery block renders images in a grid but has no lightbox or modal viewer |
| **User avatar upload** | Profile page shows Gravatar only; no custom avatar upload |
| **Media bulk delete** | Checkboxes exist in the media library but bulk delete is not wired up |
| **Scheduled post indicator** | Posts with a future date use `status='future'` internally but the admin UI has no "Scheduled" tab |
| **Widget drag-and-drop** | Widget areas display correctly but drag-and-drop reordering is not fully persisted |
| **Akismet / spam filtering** | The Akismet plugin stub exists but makes no real API calls |
| **Import validation** | WXR import does not validate for duplicate slugs or missing authors |

### Not Yet Implemented

- **Two-factor authentication**
- **Activity log** — Admin audit trail
- **Multisite** — Single-site only

---

## Project Structure

```
svelte-press/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── blocks/          # 21 block editor components
│   │   │   └── Comment.svelte   # Recursive threaded comment component
│   │   ├── server/
│   │   │   ├── api/             # REST API auth helpers
│   │   │   ├── auth/            # Session create/validate/delete
│   │   │   ├── db/              # Drizzle schema, migrations, seed
│   │   │   ├── email/           # nodemailer email service
│   │   │   ├── media/           # sharp image processing
│   │   │   ├── permissions/     # Role capabilities
│   │   │   ├── plugins/         # Hook system + loader
│   │   │   ├── scheduler/       # node-cron scheduled publishing
│   │   │   └── themes/          # Theme loader
│   │   └── utils.ts             # slugify, formatDate, truncate, etc.
│   ├── params/
│   │   ├── year.ts              # Route matcher for 4-digit years
│   │   └── month.ts             # Route matcher for month numbers
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

# Start dev server
pnpm dev
```

**MIT License** — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by <a href="https://a2ztech.io"><strong>A to Z Tech Innovations LLC</strong></a>
</p>

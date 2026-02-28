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
- **Threaded comments** — Parent/child comment structure on posts
- **Moderation queue** — Approve, unapprove, mark as spam, or trash comments
- **Comment status** — Per-post control (open/closed)
- **Gravatar support** — MD5-hashed email lookups for user avatars
- **Guest commenting** — Name, email, website; no account required

### Users & Roles
- **Five roles** — Administrator, Editor, Author, Contributor, Subscriber
- **Capability system** — WordPress-faithful `CAPABILITIES` map with a `can(user, cap)` helper
- **User management** — Create, edit, delete users; assign roles
- **Profile page** — Edit display name, bio, contact info, password, avatar
- **Registration** — Configurable open/closed registration via settings

### Taxonomy
- **Categories** — Hierarchical (parent/child), with slugs and descriptions
- **Tags** — Flat taxonomy; attach multiple tags per post
- **Archive pages** — Category, tag, author, and date-based archives on the public frontend

### Navigation & Widgets
- **Menu builder** — Create menus, add pages/posts/custom links/categories, drag-and-drop reorder, nested sub-items, assign to theme locations
- **Widget areas** — Sidebar, Footer columns; drag available widgets into areas
- **Built-in widgets** — Search, Recent Posts, Recent Comments, Archives, Categories, Tag Cloud, Text, Custom HTML

### Authentication
- **Session-based auth** — Thin custom session table (nanoid tokens, HTTP-only cookies, 30-day expiry)
- **Login / Register / Forgot Password** — Full auth flow at `/sp-login`, `/sp-register`, `/sp-forgot-password`
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
- **Plugin system** — WordPress-style `addAction` / `doAction` / `addFilter` / `applyFilters` hook API; plugins loaded from `plugins/*/plugin.ts` at server startup
- **Theme system** — Themes in `themes/*/`; active theme stored in `options` table; switch via admin UI
- **REST API** — Full CRUD at `/api/v1/*` for posts, pages, media, comments, users, categories, tags
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
| Embed | oEmbed-style URL embed (YouTube, Twitter, etc.) |

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
| `/sp-admin/menus` | Drag-and-drop menu builder |
| `/sp-admin/widgets` | Widget area management |
| `/sp-admin/users` | User list with role filter tabs |
| `/sp-admin/users/new` | Create new user |
| `/sp-admin/users/[id]` | Edit user |
| `/sp-admin/profile` | Current user profile and password |
| `/sp-admin/themes` | Theme grid with activate and details modal |
| `/sp-admin/plugins` | Plugin list with activate/deactivate |
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
| `/[slug]` | Single post or page |
| `/category/[slug]` | Category archive |
| `/tag/[slug]` | Tag archive |
| `/author/[username]` | Author archive with profile |
| `/search` | Full-text search results |

Frontend features: header with primary nav, sidebar with widgets (search, categories), footer, comment form on posts, Gravatar avatars, responsive layout.

---

## Plugin System

Plugins live in `plugins/<name>/plugin.ts` and are loaded at server startup via `hooks.server.ts`.

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

Themes live in `themes/<name>/theme.json`. The active theme is stored in the `options` table and switchable from the admin. Three themes ship by default: `default`, `minimal`, `magazine`.

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

---

## REST API

All endpoints at `/api/v1/` support standard CRUD. Authentication uses the same session cookie.

| Endpoint | Methods |
|---|---|
| `/api/v1/posts` | GET, POST |
| `/api/v1/pages` | GET, POST |
| `/api/v1/media` | GET, POST |
| `/api/v1/comments` | GET, POST |
| `/api/v1/users` | GET, POST |
| `/api/v1/categories` | GET, POST |
| `/api/v1/tags` | GET, POST |
| `/api/upload` | POST (multipart file upload) |

---

## Known Issues & Incomplete Features

This project is in active early development. The core content creation and management flow works end-to-end, but several areas are incomplete or have known bugs.

### Known Bugs

- **Visibility selector defaults to "Password Protected"** — The Visibility combobox in the post editor sidebar shows "Password Protected" as the initial selected option instead of "Public" on new posts. The correct status is still submitted on publish.

- **Svelte comment nodes in block content** — `{@html}` inside contenteditable divs causes Svelte to insert `<!---->` anchor comment nodes into the block's stored HTML. These render invisibly in the browser but accumulate in the database content field over multiple edits.

- **Hydration mismatch warning** — A `[svelte] hydration_mismatch` console warning appears on post edit pages. Does not affect functionality but indicates a server/client render discrepancy in the block editor.

- **Nested form warning** — The post edit page logs a `node_invalid_placement_ssr: <form>` error from a nested form structure in the sidebar. Visual behavior is unaffected.

### Incomplete / Stub Features

| Feature | Status |
|---|---|
| **Forgot password email** | UI exists; token is logged to console only — no email is sent. Requires an SMTP integration. |
| **Plugin activation** | The plugins admin page shows plugins and allows toggling, but plugins are always loaded from disk at startup regardless of activation state. Activation state is not persisted. |
| **Theme templates** | The theme system switches the active theme in the database, but the frontend does not yet dynamically load per-theme Svelte components or CSS. All themes render with the same default frontend layout. |
| **Widget drag-and-drop** | The widgets admin page renders widget areas and available widgets but drag-and-drop reordering is not fully wired to persistence. |
| **Menu drag-and-drop** | The menus admin page has the UI for drag-and-drop reordering of menu items, but nested sub-items require manual parent assignment. |
| **Date archive pages** | The `/[year]/[month]/` route is listed in the plan but not yet implemented. |
| **oEmbed resolution** | The Embed block stores a URL but does not perform oEmbed discovery or fetch embed HTML from providers. |
| **Columns block nesting** | The Columns block renders a two-column layout but does not support nested blocks inside each column. |
| **Gallery lightbox** | Gallery block renders images in a grid but has no lightbox or modal viewer. |
| **Comment threading UI** | Comments are stored with `parentId` for threading but the frontend renders them as a flat list. |
| **Password-protected posts** | The `status` field supports `'private'` and password protection but the frontend does not enforce password gates. |
| **User avatar upload** | The profile page shows the current Gravatar but does not support uploading a custom avatar. |
| **Scheduled post indicator** | Posts with a future `postDate` are set to `status = 'future'` internally but the admin UI does not display a "Scheduled" status tab. |
| **Media bulk delete** | The media library grid has checkboxes but bulk delete is not implemented. |
| **Akismet / spam filtering** | The Akismet plugin stub exists but makes no real API calls. Comments go directly to pending without spam scoring. |
| **Permalink structure enforcement** | The Permalinks settings page saves the chosen structure but the frontend router always uses `/[slug]` regardless of the setting. |
| **Import validation** | WXR import parses and inserts content but does not validate for duplicate slugs or missing authors. |
| **REST API authentication** | API endpoints read the session cookie but do not enforce authentication on write endpoints in all cases. |
| **svelte-check type errors** | Several auto-generated admin pages have minor TypeScript errors that do not affect runtime behavior. |

### Not Yet Implemented

- **Email notifications** — Comment notifications to post authors, new user registration emails
- **Two-factor authentication**
- **Activity log** — Admin audit trail
- **Site health check** — Dashboard widget stub only
- **Multisite** — Single-site only

---

## Project Structure

```
svelte-press/
├── src/
│   ├── lib/
│   │   ├── components/blocks/   # 21 block editor components
│   │   ├── server/
│   │   │   ├── auth/            # Session create/validate/delete
│   │   │   ├── db/              # Drizzle schema, migrations, seed
│   │   │   ├── media/           # sharp image processing
│   │   │   ├── permissions/     # Role capabilities
│   │   │   ├── plugins/         # Hook system + loader
│   │   │   ├── scheduler/       # node-cron scheduled publishing
│   │   │   └── themes/          # Theme loader
│   │   └── utils.ts             # slugify, formatDate, truncate, etc.
│   └── routes/
│       ├── (admin)/sp-admin/    # All admin routes
│       ├── (auth)/              # Login, register, forgot password
│       ├── (frontend)/          # Public blog routes
│       └── api/v1/              # REST API
├── plugins/                     # Plugin directory
├── themes/                      # Theme directory
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

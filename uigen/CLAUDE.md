# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

- Use comments sparingly. Only comment complex code.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/editor/__tests__/file-tree.test.tsx

# Reset database
npm run db:reset
```

## Architecture

UIGen is a Next.js 15 (App Router) application that lets users generate React components via AI chat with a live preview.

### Data Flow

1. User types a prompt in **ChatInterface** → submitted to `/api/chat`
2. `/api/chat/route.ts` calls the AI model with two tools: `str_replace_editor` and `file_manager`
3. As the AI streams tool calls, `ChatContext` (`onToolCall`) routes each call to `FileSystemContext.handleToolCall`
4. `FileSystemContext` mutates the in-memory `VirtualFileSystem` and increments `refreshTrigger`
5. `PreviewFrame` watches `refreshTrigger`, rebuilds the import map + preview HTML, and sets it as `iframe.srcdoc`

### Virtual File System (`src/lib/file-system.ts`)

All generated code lives in a `VirtualFileSystem` instance — nothing is written to disk. Files are serialized to `Record<string, FileNode>` (plain objects, no Maps) for JSON transport. The VFS is reconstructed on each API request from the `files` body field sent by the client.

### Preview Pipeline (`src/lib/transform/jsx-transformer.ts`)

`createImportMap()` does two things:
- Transforms all `.jsx/.tsx/.ts/.js` files with Babel Standalone (handles JSX + TypeScript in-browser)
- Creates blob URLs for each file and builds an ES module import map
- Third-party packages are resolved via `https://esm.sh/<package>` automatically
- Missing local imports get placeholder empty modules to prevent crashes

`createPreviewHTML()` produces a full HTML document with an inline import map and a `<script type="module">` that mounts the React app (entry point: `/App.jsx` or `/App.tsx`, falling back to the first `.jsx`/`.tsx` file found).

### AI Tools

Two Vercel AI SDK tools are registered in `/api/chat/route.ts`:
- **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): `view`, `create`, `str_replace`, `insert` commands — mirrors Anthropic's text editor tool interface
- **`file_manager`** (`src/lib/tools/file-manager.ts`): `rename`, `delete` commands

### Authentication

Custom JWT-based auth via `jose` (`src/lib/auth.ts`). Sessions stored in an httpOnly cookie (`auth-token`). Middleware at `src/middleware.ts` handles route protection. Anonymous users can use the app without signing in; their work is tracked in `src/lib/anon-work-tracker.ts` and can be claimed after sign-up.

### Database

Prisma with SQLite (`prisma/dev.db`). Two models:
- `User` — email + bcrypt-hashed password
- `Project` — stores serialized messages (`String`) and file system state (`data: String`) as JSON strings. `userId` is optional (anonymous projects have no owner).

Prisma client is generated to `src/generated/prisma` (not the default location).

The full database schema is defined in `prisma/schema.prisma`. Reference it whenever you need to understand the structure of data stored in the database.

### AI Provider

`src/lib/provider.ts` exports `getLanguageModel()`. If `ANTHROPIC_API_KEY` is set, it uses `claude-haiku-4-5`. Otherwise it falls back to a `MockLanguageModel` that returns hardcoded component code — useful for local dev without an API key.

### Context Providers

`MainContent` wraps the entire UI in two nested providers:
1. `FileSystemProvider` — owns the `VirtualFileSystem` instance and exposes CRUD + `handleToolCall`
2. `ChatProvider` — wraps Vercel AI SDK's `useChat`, wires `onToolCall` to `FileSystemContext.handleToolCall`, and sends the serialized file system on every request

### Key Environment Variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required for real AI generation; omit to use mock provider |
| `JWT_SECRET` | Signs session tokens; defaults to a hardcoded dev value |
| `DATABASE_URL` | SQLite path, defaults to `file:./prisma/dev.db` |

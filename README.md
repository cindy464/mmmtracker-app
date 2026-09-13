# ChezaCheza MMM — fixed for StackBlitz / Bolt

Your component logic is untouched except for the two changes you asked
for (AI panel removed, sync status made visible). What crashed it
outside Figma was missing project scaffolding, not the code itself:

1. **`@/imports/...` alias.** Figma Make resolves this specially; a plain
   Vite project doesn't know what `@` means until you tell it. Fixed in
   `vite.config.ts` (`resolve.alias`) and `tsconfig.json` (`paths`), both
   pointing `@` at `src/`. I dropped a placeholder PNG at
   `src/imports/Screenshot_2026-06-09_151556-1.png` — swap in your real
   logo export at that exact path/filename.

2. **Missing `package.json`.** `@supabase/supabase-js` wasn't declared
   anywhere, so StackBlitz/Bolt had nothing telling them to install it
   before the import statement ran. Added it, plus Vite/React/Tailwind/TS
   tooling.

3. **TypeScript syntax with no TS project.** The file uses
   `useState<any>(null)`, `: string` parameter types, etc. That only
   parses inside a `.tsx` file under a TypeScript-aware bundler — added
   `tsconfig.json` and named the file `src/App.tsx`.

4. **Tailwind classes with no Tailwind.** The whole UI is Tailwind
   utility classes; without `tailwind.config.js` + `postcss.config.js` +
   the `@tailwind` directives in `src/index.css`, it would render
   completely unstyled (not a crash, but "not working" all the same).

## What changed at your request

- **AI Assistant panel removed** — the whole `AISummaryPanel` component,
  its category list, and the `@anthropic-ai/sdk` import/dependency are
  gone. That also let me drop `vite-plugin-node-polyfills`, which existed
  only to stop that SDK crashing in the browser.
- **Sync status is now a real badge**, not a small text line — a colored
  pill in the header (🟢 live and synced / 🟡 local only / 🔴 save error /
  gray while connecting) driven by an actual `sync.state` value in code,
  so it's obvious at a glance whether the team's changes are really
  reaching the shared Supabase table.
- **Confirmed your Supabase backend is already real and working** — the
  `app_state` table exists in your project and already holds live data
  from an earlier test. Nothing needed to be created there.

## Running it

```bash
npm install
npm run dev
```

## Before you actually use it

- Swap the placeholder logo in `src/imports/` for your real export.
- The Supabase URL/anon key and the "cheza" admin password are hardcoded
  in `src/App.tsx`, exactly as you had them — nothing changed there.

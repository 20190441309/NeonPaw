# PWA Support Design

> Date: 2026-05-17
> Status: Approved

## Overview

Enhance NEON PAW's existing PWA foundation with install prompt, offline fallback, better caching, and mobile polish. Icons remain placeholders for now — terminal-style pixel cat icons will be added later.

## Existing Infrastructure

- `frontend/src/app/manifest.ts` — Web App Manifest (name, icons, standalone, colors)
- `frontend/public/sw.js` — Service Worker (network-first API, cache-first static)
- `frontend/public/icon-192.png` + `icon-512.png` — Placeholder icons
- `frontend/src/app/page.tsx` — Service worker registration already in place

## Decisions

- Icons: keep placeholders, swap for terminal-style pixel cat later
- All three areas implemented: install prompt, offline experience, mobile polish

---

## 1. Install Prompt

### Behavior

- Detect `beforeinstallprompt` event
- Show terminal-style install banner at bottom of page
- User clicks INSTALL to trigger browser install
- User clicks X to dismiss — localStorage remembers dismissal
- Auto-hide after successful install

### UI

```
┌─────────────────────────────────────────┐
│ 📦 INSTALL NEON PAW  │  [INSTALL] [X]  │
└─────────────────────────────────────────┘
```

### Implementation

- New component: `frontend/src/components/InstallBanner.tsx`
- New hook: `frontend/src/hooks/useInstallPrompt.ts`
- Stores dismissal in `neon_paw_install_dismissed` localStorage key
- Listens for `beforeinstallprompt` and `appinstalled` events
- Rendered in `page.tsx` above the TerminalShell

---

## 2. Offline Experience

### Service Worker Enhancements

Current `sw.js` gets these improvements:

- **Cache versioning** — bump `CACHE_NAME` to `neon-paw-v2`, auto-clean old caches on activate (already works)
- **App Shell precache** — cache `/`, icons, and key static assets on install
- **Offline fallback** — when navigation request fails and nothing cached, serve `offline.html`

### Offline Fallback Page

New file: `frontend/public/offline.html`

```
╭────────────────────────────────────────╮
│  NEON PAW // OFFLINE                   │
├────────────────────────────────────────┤
│                                        │
│     /\_/\                              │
│    ( -.- )    SIGNAL LOST              │
│     > ^ <                              │
│                                        │
│  NEON PAW is unreachable right now.    │
│  Check your connection and try again.  │
│                                        │
╰────────────────────────────────────────╯
```

- Styled with inline CSS (no external deps — must work offline)
- Uses same terminal color scheme: `#0a0a0a` bg, `#00ffcc` text
- Monospace font, centered layout
- Auto-refreshes when connection restored (meta refresh or JS)

### Updated sw.js

```javascript
const CACHE_NAME = "neon-paw-v2";
const STATIC_ASSETS = ["/", "/offline.html", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation: network-first, fallback to cache, then offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

---

## 3. Mobile Polish

### Viewport Configuration

In `frontend/src/app/layout.tsx`, add metadata export:

```typescript
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};
```

### CSS Additions

In `frontend/src/app/globals.css`:

```css
/* Mobile touch highlight */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Full viewport height including mobile browser chrome */
html {
  height: 100dvh;
}

body {
  min-height: 100dvh;
  min-height: 100vh; /* fallback */
}

/* Safe area padding for iPhone notch/bottom bar */
.terminal-shell {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/hooks/useInstallPrompt.ts` | Create | Detect and manage install prompt |
| `frontend/src/components/InstallBanner.tsx` | Create | Terminal-style install banner UI |
| `frontend/public/sw.js` | Modify | Enhanced caching + offline fallback |
| `frontend/public/offline.html` | Create | Offline fallback page |
| `frontend/src/app/layout.tsx` | Modify | Add viewport metadata |
| `frontend/src/app/globals.css` | Modify | Mobile polish CSS |
| `frontend/src/app/page.tsx` | Modify | Render InstallBanner |
| `frontend/src/app/manifest.ts` | Modify | Add `id` field for install tracking |

## Testing

- Verify `npm run build` passes
- Verify manifest loads at `/manifest.webmanifest`
- Test offline: load page, disconnect network, refresh — should show offline page
- Test install: on Chrome mobile, verify install banner appears
- Test mobile: verify no zoom on double-tap, proper viewport, safe area padding

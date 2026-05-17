# PWA Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance NEON PAW's PWA with install prompt, offline fallback, and mobile polish.

**Architecture:** Three independent improvements: (1) a `useInstallPrompt` hook + `InstallBanner` component for the browser install prompt, (2) enhanced `sw.js` with offline fallback page, (3) viewport metadata and mobile CSS. Each area is self-contained and can be built in any order.

**Tech Stack:** React hooks, Next.js metadata API, Service Worker API, Tailwind CSS, inline CSS for offline page.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/hooks/useInstallPrompt.ts` | Create | Detect and manage beforeinstallprompt |
| `frontend/src/components/InstallBanner.tsx` | Create | Terminal-style install banner UI |
| `frontend/public/offline.html` | Create | Offline fallback page |
| `frontend/public/sw.js` | Modify | Enhanced caching + offline navigation |
| `frontend/src/app/layout.tsx` | Modify | Add viewport width/scale settings |
| `frontend/src/app/globals.css` | Modify | Mobile polish CSS |
| `frontend/src/app/page.tsx` | Modify | Render InstallBanner |
| `frontend/src/app/manifest.ts` | Modify | Add `id` field |

---

### Task 1: useInstallPrompt hook

**Files:**
- Create: `frontend/src/hooks/useInstallPrompt.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/hooks/useInstallPrompt.ts
"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISSED_KEY = "neon_paw_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already dismissed?
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    // Check if already running as installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setCanInstall(false);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setCanInstall(false);
    setDeferredPrompt(null);
  }, []);

  return { canInstall, isInstalled, install, dismiss };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd D:/pytest/NeonPaw/frontend && npx tsc --noEmit src/hooks/useInstallPrompt.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useInstallPrompt.ts
git commit -m "feat: add useInstallPrompt hook for PWA install detection"
```

---

### Task 2: InstallBanner component

**Files:**
- Create: `frontend/src/components/InstallBanner.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/InstallBanner.tsx
"use client";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 border-t border-[var(--terminal-border)] bg-[var(--terminal-bg)]/95 backdrop-blur-sm text-[10px]">
      <span className="opacity-60 tracking-wider">
        📦 INSTALL NEON PAW
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={install}
          className="px-2 py-0.5 border border-[var(--terminal-text)]/50 text-[var(--terminal-text)] opacity-70 hover:opacity-100 transition-opacity tracking-wider"
        >
          INSTALL
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="opacity-30 hover:opacity-60 transition-opacity"
        >
          [X]
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd D:/pytest/NeonPaw/frontend && npx tsc --noEmit src/components/InstallBanner.tsx`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/InstallBanner.tsx
git commit -m "feat: add InstallBanner component for PWA install prompt"
```

---

### Task 3: Offline fallback page

**Files:**
- Create: `frontend/public/offline.html`

- [ ] **Step 1: Create the offline page**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NEON PAW // OFFLINE</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      color: #00ffcc;
      font-family: 'Courier New', 'Consolas', monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 16px;
    }
    .container {
      max-width: 400px;
      width: 100%;
      border: 1px solid rgba(0, 255, 204, 0.2);
      border-radius: 2px;
      padding: 24px;
      text-align: center;
    }
    .title {
      font-size: 10px;
      letter-spacing: 0.15em;
      opacity: 0.5;
      margin-bottom: 16px;
    }
    .pet {
      font-size: 24px;
      line-height: 1.4;
      margin: 16px 0;
    }
    .status {
      font-size: 12px;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    .message {
      font-size: 10px;
      opacity: 0.5;
      line-height: 1.6;
    }
    .retry {
      display: inline-block;
      margin-top: 16px;
      padding: 4px 12px;
      border: 1px solid rgba(0, 255, 204, 0.3);
      background: transparent;
      color: #00ffcc;
      font-family: inherit;
      font-size: 10px;
      letter-spacing: 0.1em;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .retry:hover { opacity: 1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">NEON PAW // OFFLINE</div>
    <div class="pet">
      /\_/\<br>
      ( -.- )<br>
      &gt; ^ &lt;
    </div>
    <div class="status">SIGNAL LOST</div>
    <div class="message">
      NEON PAW is unreachable right now.<br>
      Check your connection and try again.
    </div>
    <button class="retry" onclick="location.reload()">RETRY</button>
  </div>
  <script>
    // Auto-retry when online
    window.addEventListener("online", () => location.reload());
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/public/offline.html
git commit -m "feat: add offline fallback page with terminal styling"
```

---

### Task 4: Enhanced Service Worker

**Files:**
- Modify: `frontend/public/sw.js`

- [ ] **Step 1: Replace sw.js contents**

```javascript
// frontend/public/sw.js
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

- [ ] **Step 2: Commit**

```bash
git add frontend/public/sw.js
git commit -m "feat: enhance service worker with offline fallback and navigation caching"
```

---

### Task 5: Viewport metadata and mobile CSS

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Update viewport in layout.tsx**

Replace the existing viewport export:

```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};
```

- [ ] **Step 2: Add mobile CSS to globals.css**

Append to the end of `globals.css`:

```css
/* Mobile touch highlight removal */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Full viewport height for mobile browsers */
html {
  height: 100dvh;
}

body {
  min-height: 100dvh;
  min-height: 100vh; /* fallback for older browsers */
}

/* Safe area padding for iPhone notch/bottom bar */
.terminal-scroll {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
```

- [ ] **Step 3: Verify build**

Run: `cd D:/pytest/NeonPaw/frontend && npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/globals.css
git commit -m "feat: add viewport metadata and mobile CSS polish"
```

---

### Task 6: Wire InstallBanner into page.tsx

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Add import**

Add to imports:

```tsx
import InstallBanner from "@/components/InstallBanner";
```

- [ ] **Step 2: Add component**

Before the closing `</TerminalShell>` tag (after `SettingsPanel`), add:

```tsx
      <InstallBanner />
```

- [ ] **Step 3: Verify build**

Run: `cd D:/pytest/NeonPaw/frontend && npx tsc --noEmit src/app/page.tsx`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add InstallBanner to main page"
```

---

### Task 7: Update manifest with id field

**Files:**
- Modify: `frontend/src/app/manifest.ts`

- [ ] **Step 1: Add id field**

Add `id: "/"` to the manifest return:

```typescript
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NEON PAW // Terminal Pet OS",
    short_name: "NEON PAW",
    description: "ADK-ready AI terminal pet with voice interaction",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/manifest.ts
git commit -m "feat: add id field to PWA manifest"
```

---

### Task 8: Full build and final verification

- [ ] **Step 1: Full build**

Run: `cd D:/pytest/NeonPaw/frontend && npm run build`
Expected: build succeeds

- [ ] **Step 2: Lint check**

Run: `cd D:/pytest/NeonPaw/frontend && npm run lint`
Expected: no new errors (pre-existing warnings OK)

- [ ] **Step 3: Verify manifest loads**

The build output should include `/manifest.webmanifest`.

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build issues from PWA support"
```

---

### Task 9: Update roadmap

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Mark PWA as complete**

Find:
```markdown
- [ ] Add PWA support.
```

Change to:
```markdown
- [x] Add PWA support.
  Include manifest, icons, mobile polish, and an installable shell.
```

- [ ] **Step 2: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: mark P5 PWA support as implemented"
```

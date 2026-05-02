# NEON PAW

An ADK-ready AI terminal pet with voice interaction.

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the terminal pet.

## Features

- Retro terminal-style UI with ASCII art
- Pet state machine with localStorage persistence
- Click-to-wake interaction
- Scanline, glow, and flicker effects
- Status bars for energy, mood, affinity, and hunger

## Tech Stack

- Next.js 14 + TypeScript + Tailwind CSS
- CSS-only effects (no Framer Motion)
- localStorage for state persistence

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── TerminalShell.tsx
│   │   ├── ASCIIPet.tsx
│   │   └── PetStatusPanel.tsx
│   ├── hooks/
│   │   └── usePetState.ts
│   └── lib/
│       ├── types.ts
│       └── petFrames.ts
```

## License

MIT

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

These are the magic words you type in the terminal to make things happen:

```bash
# First time ever using this project? Run this one first.
# It installs everything the project needs, like unpacking a LEGO set before building.
npm run setup

# Starts the app on your computer so you can see it in the browser.
# Think of it like turning on the lights before guests arrive.
npm run dev

# Packages the app for the real world (the internet).
# Like packing a suitcase neatly before a trip — slower but tidy.
npm run build

# Runs all the automatic checks to make sure nothing is broken.
# Like a robot proofreader that reads every page of a book.
npm run test

# Run checks on just ONE specific file instead of everything.
# Replace the file path at the end with whichever file you want to check.
npm run test -- --run src/lib/__tests__/file-system.test.ts

# Checks the code for style mistakes (like a grammar checker for code).
npm run lint

# Teaches the database about any new changes to its structure.
# Like handing the filing cabinet a new set of folders it didn't have before.
npx prisma migrate dev

# Wipes the database completely clean and starts over.
# WARNING: This throws away all saved data. Like formatting a hard drive.
npm run db:reset
```

> The dev/build/start commands secretly add some extra setup behind the scenes (`node-compat.cjs`). You don't need to worry about it — it's already handled for you.

## How the App Works (Big Picture)

UIGen is like a magic sketchpad. You type "make me a blue button" in a chat box, and an AI (Claude) draws the button for you — as real, working code — and you see it appear instantly on screen.

Here's the journey from your words to the button on screen:

```
You type a message
      ↓
The app sends it to the AI brain (/api/chat)
      ↓
The AI writes code files using its tools (like a robot programmer)
      ↓
Those files go into a pretend hard drive that lives only in your browser memory
      ↓
The code gets translated into something the browser can show
      ↓
A tiny window (iframe) inside the page renders your component — live!
```

## Key Pieces and What They Do

### The Pretend Hard Drive — Virtual File System
**File:** `src/lib/file-system.ts`

Imagine a filing cabinet that exists only in RAM — it disappears when you close the tab (unless saved). The AI writes files into this cabinet. When you save a project, the cabinet's contents get packed into a single blob of text and stored in the real database.

### The Shared Noticeboards — Context Providers
**Folder:** `src/lib/contexts/`

Two noticeboards that every part of the app can read and write to:

- **FileSystemProvider** — the noticeboard for "what files exist right now." The file tree, code editor, and preview window all read from it.
- **ChatProvider** — the noticeboard for "what is the AI saying." It listens to the AI's replies and, when the AI says "create this file," it writes that to the file system noticeboard.

### The AI Brain — Provider
**File:** `src/lib/provider.ts`

Connects to Anthropic's Claude (the real AI). If you don't have an API key, it uses a fake AI (`MockLanguageModel`) that always generates the same simple component — so the app still works even without internet or credentials.

### The Robot Translator — JSX Transformer
**File:** `src/lib/transform/jsx-transformer.ts`

The AI writes code in a language called JSX (a mix of JavaScript and HTML). Browsers don't understand JSX natively. This translator converts JSX into plain JavaScript the browser can run, then hands it to the little preview window.

### The AI's Hands — Tools
**Folder:** `src/lib/tools/`

The AI can't directly touch files — it has to use special tools, like a surgeon using instruments instead of bare hands:

- **`str_replace_editor`** — creates a new file or changes part of an existing one
- **`file_manager`** — renames or deletes files

### The Database — Data Model

Two things get saved to the database (a simple SQLite file called `dev.db`):

```
User (who you are: email + password)
  └── Project (your work: the chat history + all the files you created)
```

`messages` = the full conversation with the AI, saved as a list.
`data` = a snapshot of the pretend hard drive, saved as text.

### Logging In — Authentication
**File:** `src/lib/auth.ts`

Uses a "signed ticket" system (JWT). When you log in, the server hands you a ticket (stored in a cookie your browser holds automatically). Every request you make shows that ticket to prove you are who you say you are. Passwords are scrambled with `bcrypt` before saving so even the database can't read them.

Anonymous users (no account) can still use the app — their work is tracked temporarily in the browser (`anon-work-tracker.ts`) and can be claimed when they sign up.

### The Screen Layout
**File:** `src/app/main-content.tsx`

The page is split into draggable panels (you can resize them):

- **Left panel** — the chat box where you talk to the AI
- **Right panel** — two tabs:
  - **Preview** — the live mini-browser showing your component
  - **Code** — a file tree + code editor so you can read/edit what the AI wrote

## Import Shortcut

Anywhere in the code, `@/` is a shortcut that means "start from the `src/` folder." So `@/lib/utils` means `src/lib/utils`. Use this instead of messy relative paths like `../../lib/utils`.

## Tests

Tests are automatic checks that make sure the code still does what it's supposed to do, even after changes.

```bash
npm run test                        # Keep watching for changes and re-run tests automatically
npm run test -- --run               # Run all tests once and stop
npm run test -- --run <file-path>   # Test just one file
```

Test files live next to the code they check, inside folders named `__tests__/`.

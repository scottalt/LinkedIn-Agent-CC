# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LinkedIn Agent built with the Anthropic Claude API. This is a new project — no structure exists yet.

## Tech Stack (planned)

- Runtime: Node.js with TypeScript
- AI: Anthropic SDK (`@anthropic-ai/sdk`)
- Framework: TBD based on requirements

## Development Commands

Add these once the project is initialized (e.g., after `npm init` or framework scaffolding):

```bash
# Install dependencies
npm install

# Run in dev mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## Key Conventions

- TypeScript throughout, strict mode preferred
- No backwards-compatibility hacks or unnecessary abstractions
- Edit existing files over creating new ones where possible
- Use the `claude-api` skill when working with Anthropic SDK integrations

# AGENTS.md

This file helps Autohand understand how to work with this project.

## Project Overview

- **Language**: TypeScript
- **Package Manager**: pnpm

## Commands

- **Install**: `pnpm install`
- **Dev**: `pnpm dev`
- **Build**: `pnpm build`
- **Format**: `pnpm format`

## Code Style

- Use strict TypeScript settings
- Define types/interfaces for data structures
- Avoid `any` type - use `unknown` if type is truly unknown
- Use type inference where obvious
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small
- Format code with **Prettier**

## Constraints

- Do not modify files outside the project directory
- Ask before making breaking changes
- Prefer editing existing files over creating new ones
- Do not delete files without confirmation
- Keep dependencies minimal - avoid adding new ones without good reason
- Do not commit sensitive data (API keys, secrets, credentials)

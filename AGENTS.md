# AGENT.md

## Purpose

This project uses React, React Router 7 framework mode, and TypeScript. Follow these instructions when creating or changing frontend code so the codebase stays consistent, simple, and easy to maintain.

## Core Principles

- Reuse existing code before writing new code.
- Check the codebase for similar patterns, helpers, components, hooks, loaders, and route implementations first.
- Keep things DRY. Do not duplicate logic, component structure, API calls, or type definitions.
- Prefer simple, clear, maintainable solutions over clever abstractions.
- Keep components small, focused, and easy to read.
- Refactor when a file grows too large or starts handling more than one responsibility.
- Avoid Props drilling where possible

## TypeScript Rules

- Prefer `type` instead of `interface`.
- Use explicit types for component props, utility inputs, loader data, action data, and shared domain models.
- Keep shared types in dedicated files under `app/types` when they are used in multiple places.
- Keep route-specific types close to the route unless they are reused elsewhere.
- Prefer union types and narrow, composable types over broad catch-all shapes.
- Avoid `any`. If a type is unknown, use `unknown` and narrow it safely.

## React Rules

- Use arrow functions for functions and components.
- Do not define multiple unrelated components in one file.
- Keep each component in its own file when it has meaningful UI or logic responsibility.
- Extract nested JSX into separate components when a component becomes hard to scan.
- Keep presentational concerns separate from data loading and side effects where possible.
- Prefer props that are small and explicit instead of passing large objects when only a few fields are needed.
- Derive state when possible instead of storing duplicated state.
- Keep hooks at the top level and avoid unnecessary effects.

## File Organization

- Put reusable UI components in `app/components`.
- Put route modules in `app/routes`.
- Put reusable utility functions in `app/utils`.
- Write utility functions in separate files under `app/utils`; do not hide reusable helpers inside route files or component files.
- Keep route-only helpers close to the route only if they are truly local and not reused.
- Split large route files by moving view pieces, helpers, and types into nearby files when needed.

## React Router 7 Framework Rules

- Follow React Router 7 framework conventions already used in this repo, especially `app/root.tsx`, `app/routes.ts`, and route module files under `app/routes`.
- Keep route modules focused on route concerns: `loader`, `action`, `meta`, `links`, middleware, error boundaries, and the route component.
- Prefer route `loader` and `action` functions for data loading and mutations instead of fetching inside components when the work belongs to routing.
- Use generated route types where available and keep route module signatures aligned with React Router framework conventions.
- Prefer `Link`, `Form`, navigation helpers, and framework APIs from React Router over ad hoc navigation patterns.
- Keep error handling close to the route boundary when the failure is route-specific.
- Reuse existing layout routes and nested route patterns instead of introducing parallel structures.

## Reuse-First Workflow

Before writing code:

1. Search for similar routes, components, hooks, and utilities.
2. Reuse or extend an existing implementation when it fits.
3. If duplication starts to appear, extract a shared utility, component, or type.
4. Place the shared code in the appropriate folder and keep naming consistent with the current codebase.

## Maintainability Checklist

Before finishing a change, confirm:

- The code matches existing project patterns.
- Types use `type` aliases instead of `interface`.
- Components are small and separated into appropriate files.
- Reusable helpers live in `app/utils`.
- Repeated logic has been extracted.
- The solution is easy for another developer to read and modify.
- The implementation is the simplest one that satisfies the requirement.
- Run `npm run format` for prettier rules
- Run `npm run typecheck` to ensure types are not failing
- Run `npm run lint` to check the eslint rules

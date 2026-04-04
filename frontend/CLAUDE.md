# Frontend Guidelines

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS, Better Auth

## Key Files
- `lib/auth.ts` - Better Auth server config
- `lib/auth-client.ts` - Client hooks: signIn, signUp, signOut, useSession
- `lib/api.ts` - All backend API calls (uses /backend proxy)
- `next.config.ts` - Proxy rewrites to backend port 8000

## Patterns
- Use "use client" only for interactive components
- API calls always go through lib/api.ts
- Auth session from useSession() hook

## Running
npm run dev  (port 3000)

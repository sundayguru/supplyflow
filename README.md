# CourseXQuiz

Interactive learning platform

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## Gmail RFQ ingestion

The Worker checks Gmail every minute, classifies new messages with the
organization's preferred Groq, Gemini, or Ollama Cloud model, and
creates RFQs for messages that contain quotation requests. The ingestion layer
uses provider-neutral email and extraction interfaces so either provider can be
replaced without changing the scheduling or database workflow.

Required Worker secrets:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID --env production
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
npx wrangler secret put GROQ_API_KEY --env production
npx wrangler secret put GEMINI_API_KEY --env production
npx wrangler secret put OLLAMA_API_KEY --env production
npx wrangler secret put TOKEN_ENCRYPTION_KEY --env production
```

`TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key. Users connect
Gmail from the Connected accounts page; refresh tokens are requested with the
`https://www.googleapis.com/auth/gmail.readonly` scope and encrypted before
being stored. Extracted RFQs belong to the connected inbox's organization. For
local development, place the same secret names in the ignored `.dev.vars` file.
Organization owners choose the preferred model on the organization page.

Generate an encryption key with `openssl rand -base64 32`. In the Google OAuth
client, register `https://supplyflow.com/api/email-accounts/google/callback`
and the equivalent localhost callback as authorized redirect URIs.

Test the scheduled handler locally with the Cloudflare Vite development server:

```sh
curl "http://localhost:5173/cdn-cgi/handler/scheduled?cron=*+*+*+*+*"
```

An authenticated administrator can also trigger the same pipeline through the
application endpoint:

```sh
curl -X POST -H "Cookie: session=<admin-session>" \
  http://localhost:5173/api/email-ingestion/trigger
```

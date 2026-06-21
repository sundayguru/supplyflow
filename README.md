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

The Worker checks Gmail every minute, classifies new messages with Groq, and
creates RFQs for messages that contain quotation requests. The ingestion layer
uses provider-neutral email and extraction interfaces so either provider can be
replaced without changing the scheduling or database workflow.

Required Worker secrets:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID --env production
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
npx wrangler secret put GMAIL_REFRESH_TOKEN --env production
npx wrangler secret put GROQ_API_KEY --env production
npx wrangler secret put RFQ_OWNER_EMAIL --env production
```

The Gmail refresh token must be issued with the
`https://www.googleapis.com/auth/gmail.readonly` scope. `RFQ_OWNER_EMAIL` must
match an existing SupplyFlow user; extracted RFQs are assigned to that user.
For local development, place the same names in the ignored `.dev.vars` file.
The model is configured through the non-secret `RFQ_LLM_MODEL` Wrangler
variable and defaults to `llama-3.3-70b-versatile`.

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

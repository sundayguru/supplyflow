declare namespace Cloudflare {
  // Cloudflare's generated Env interface is intentionally extended here.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Env {
    ADMIN_EMAILS?: string;
    JWT_SECRET?: string;
    SENDGRID_API_KEY?: string;
    SENDGRID_FROM_EMAIL?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_PORTAL_CONFIGURATION_ID?: string;
  }
}

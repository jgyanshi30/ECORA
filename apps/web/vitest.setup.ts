import { config } from "dotenv";

config({ path: ".env" });

// The automated suite must never depend on whether a real
// EMAIL_PROVIDER_API_KEY happens to be configured in the developer's local
// .env — real-provider behavior (network calls, provider-specific
// validation like Resend rejecting @example.com recipients) is not
// something these tests are set up to exercise or clean up after. Force
// the console-log fallback (lib/email/index.ts) deterministically,
// regardless of ambient environment state. Found as a real bug: once a
// real key was added locally, tests/admin-notes.test.ts,
// tests/admin-bulk-status.test.ts, and tests/process-job.test.ts started
// failing on a genuine Resend 422 (rejecting *@example.com), not a code
// regression.
process.env.EMAIL_PROVIDER_API_KEY = "";

/**
 * Entry point of the Worker: the generated OpenNext worker + a `scheduled()` handler used for
 * the Supabase keep-alive. Referenced by `main` in wrangler.jsonc.
 *
 * `.open-next/worker.js` only exists after `npm run build:cf`.
 */
// The file is generated (absent before `build:cf`, untyped JS after), so a suppression that
// works in both states is required: @ts-expect-error would fail once the file exists.
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore generated at build time by `opennextjs-cloudflare build`
import openNextWorker from "../.open-next/worker.js";
import { pingSupabase, type KeepAliveEnv } from "./keepalive";

// Durable Object classes exported by the generated worker (unused by our config: the static
// assets incremental cache needs none, but the generated worker exports them, keep parity).
// @ts-ignore generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js";

const worker = {
  fetch: openNextWorker.fetch,

  // Only invoked when a cron trigger is configured in wrangler.jsonc (currently commented out).
  async scheduled(_controller: unknown, env: KeepAliveEnv, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(
      pingSupabase(env).then((result) => {
        console.log("supabase-keepalive", JSON.stringify(result));
      }),
    );
  },
};

export default worker;

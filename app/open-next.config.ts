// OpenNext (Cloudflare) configuration. Docs: https://opennext.js.org/cloudflare
//
// The app has no ISR / on-demand cache usage that needs a writable cache (public pages are
// prerendered or dynamic, admin pages are dynamic), so we use the READ-ONLY static-assets
// incremental cache: it needs no R2 bucket / KV / D1 and therefore creates no extra
// Cloudflare resources. If ISR is ever introduced, switch to the R2 or KV incremental cache.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    // The default *.vercel.app alias serves a duplicate of the site: send it to the canonical domain.
    // Only that exact host; preview hosts and the custom domain are untouched.
    // /api/cron/* is EXCLUDED on purpose: Vercel cron does not follow redirects and reports them as
    // success with no log, so redirecting it would silently stop the Supabase keep-alive
    // (https://vercel.com/docs/cron-jobs/manage-cron-jobs).
    return [
      {
        source: "/:path((?!api/cron(?:/|$)).*)",
        // `has` host values are regexes: the dots are escaped so only the exact host matches.
        has: [{ type: "host", value: "versus-comparatore\\.vercel\\.app" }],
        destination: "https://versuscomparatorelucegas.it/:path",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

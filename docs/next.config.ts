import type { NextConfig } from "next";

// When served behind the reverse proxy at a sub-path (e.g. https://DOMAIN/docs),
// build with NEXT_PUBLIC_BASE_PATH=/docs so pages, assets and the spec proxy all
// live under that prefix. Empty (the default) serves the app at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig: NextConfig = {
  output: "standalone",
  ...(basePath ? { basePath } : {}),
  // Scalar's package does a CSS side-effect import that Next's client bundler
  // otherwise drops; transpiling it keeps the styles.
  transpilePackages: ["@scalar/api-reference-react"],
};

export default nextConfig;

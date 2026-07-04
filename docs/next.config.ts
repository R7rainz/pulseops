import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Scalar's package does a CSS side-effect import that Next's client bundler
  // otherwise drops; transpiling it keeps the styles.
  transpilePackages: ["@scalar/api-reference-react"],
};

export default nextConfig;

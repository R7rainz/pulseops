import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@scalar/api-reference-react"],
};

export default nextConfig;

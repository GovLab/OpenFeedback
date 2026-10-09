import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the app is fully client-side, so it's served as plain files
  // with no Next.js server to patch or attack
  output: "export",
  trailingSlash: true,
};

export default nextConfig;

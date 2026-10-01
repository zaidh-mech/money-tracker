import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  ...(isGitHubPages || isCapacitorBuild ? { output: "export", ...(isGitHubPages && !isCapacitorBuild ? { basePath: "/money-tracker" } : {}), trailingSlash: true } : {}),
};

export default nextConfig;

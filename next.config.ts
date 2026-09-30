import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lokales Testen über 127.0.0.1 (nur Entwicklungsserver)
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

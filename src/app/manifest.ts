import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eifel Wagyu · Dienstplan",
    short_name: "Dienstplan",
    description: "Dienstplan und Zeiterfassung für das Team",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f4",
    theme_color: "#212721",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}

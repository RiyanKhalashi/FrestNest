import type { MetadataRoute } from "next";

// Web app manifest: name and icons used by the Android app and "Add to home screen"
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FreshNest",
    short_name: "FreshNest",
    description: "Agricultural marketplace connecting farmers, dealers and transport providers in Bangladesh.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B3B24",
    theme_color: "#0B3B24",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

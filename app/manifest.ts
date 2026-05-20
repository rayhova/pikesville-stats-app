import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pikesville MBB App",
    short_name: "Pikesville MBB",
    description: "Scouting, live game workflow, assignments, practices, and reporting for the Pikesville program.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101827",
    theme_color: "#16202d",
    icons: [
      {
        src: "/branding/pikesville-panthers-logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/pikesville-panthers-logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/pikesville-panthers-logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/branding/pikesville-panthers-logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LosNuestros - Ana María",
    short_name: "Ana María",
    description: "Saldo del banco y medicamentos del día",
    start_url: "/abuela",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2a5c82",
    orientation: "any",
    lang: "es-CO",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

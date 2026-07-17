import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://splitwiz.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/reset-password"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}

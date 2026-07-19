import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL;
const APP_URL = (site && !site.includes("localhost"))
  ? site
  : "https://expense-splitter-two-flax.vercel.app";

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

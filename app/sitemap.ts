import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL;
const APP_URL = (site && !site.includes("localhost"))
  ? site
  : "https://expense-splitter-two-flax.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${APP_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${APP_URL}/forgot-password`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}

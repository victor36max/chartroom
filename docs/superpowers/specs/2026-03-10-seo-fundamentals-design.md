# SEO Fundamentals for Chartroom

## Context

Chartroom currently has minimal SEO setup — just a title and description in the root layout. There are no Open Graph tags, Twitter Cards, sitemap, robots.txt, structured data, or social share images. This makes the app invisible to search engines and produces poor previews when links are shared on social media.

This design adds SEO fundamentals using Next.js built-in metadata APIs (zero new dependencies). The production domain is `https://getchartroom.com`.

## Deliverables

### 1. Enhanced Metadata (layout.tsx)

Update the existing `metadata` export in `apps/web/src/app/layout.tsx`:

- **Title**: `{ default: "Chartroom", template: "%s | Chartroom" }`
- **Description**: Rich description with natural keywords — e.g. "Create beautiful charts from CSV data with AI. Upload your data, describe what you want, and get publication-ready Vega-Lite visualizations instantly."
- **metadataBase**: `new URL("https://getchartroom.com")`
- **Open Graph**: title, description, url, siteName ("Chartroom"), type ("website"), locale ("en_US")
- **Twitter**: card ("summary_large_image"), title, description
- **Keywords**: ["chart generator", "CSV to chart", "AI charts", "Vega-Lite", "data visualization"]
- **Authors**: [{ name: "Chartroom" }]
- **Icons**: reference existing `/favicon.ico` and `/icon.svg`

### 2. Dynamic OG Image (opengraph-image.tsx)

Create `apps/web/src/app/opengraph-image.tsx` using Next.js `ImageResponse`:

- **Size**: 1200×630px (standard OG dimensions)
- **Design**: Dark background with "Chartroom" title, tagline, and a simple abstract chart graphic rendered with basic shapes
- **Font**: DM Sans (fetched at build time to match the app)
- **Re-export** as `twitter-image` via `apps/web/src/app/twitter-image.tsx` (or alt export)

### 3. robots.ts

Create `apps/web/src/app/robots.ts`:

```
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /auth/
Sitemap: https://getchartroom.com/sitemap.xml
```

### 4. sitemap.ts

Create `apps/web/src/app/sitemap.ts`:

Single entry (SPA with one public route):
- URL: `https://getchartroom.com`
- lastModified: current date
- changeFrequency: "weekly"
- priority: 1

### 5. Structured Data (JSON-LD)

Add a `<script type="application/ld+json">` block in `layout.tsx`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Chartroom",
  "url": "https://getchartroom.com",
  "description": "Create beautiful charts from CSV data with AI",
  "applicationCategory": "DataVisualization",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

## Files Modified

| File | Action |
|------|--------|
| `apps/web/src/app/layout.tsx` | Modify — enhanced metadata + JSON-LD script |
| `apps/web/src/app/opengraph-image.tsx` | Create — dynamic OG image |
| `apps/web/src/app/twitter-image.tsx` | Create — re-exports OG image for Twitter |
| `apps/web/src/app/robots.ts` | Create — robots.txt handler |
| `apps/web/src/app/sitemap.ts` | Create — XML sitemap handler |

## Verification

1. `bun run build` — ensure all new route handlers compile
2. `bun run lint` && `bun run typecheck` — no errors
3. `bun run dev` then verify:
   - `localhost:3000/robots.txt` returns correct rules
   - `localhost:3000/sitemap.xml` returns valid XML
   - `localhost:3000/opengraph-image` returns a PNG
   - View page source — confirm OG/Twitter meta tags and JSON-LD present
4. Test social preview with a tool like opengraph.xyz (post-deploy)

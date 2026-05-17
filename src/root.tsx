import { type ReactNode } from 'react'
import { Outlet, Scripts, ScrollRestoration, Meta, Links, isRouteErrorResponse, useRouteError } from 'react-router'
import { SITE_CONFIG } from './lib/siteConfig'
import { createPublicAssetUrl } from './lib/publicAsset'
import './index.css'

const SITE_URL = SITE_CONFIG.siteUrl
const SITE_NAME = SITE_CONFIG.name

// Site-wide JSON-LD (Organization + WebSite). Injected statically into every
// prerendered HTML; per-route JSON-LD (Article / WebApplication / Breadcrumb)
// is added via each route module's `meta()`.
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: SITE_CONFIG.nameEn,
      url: `${SITE_URL}/`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_CONFIG.defaultDescription,
      inLanguage: 'zh-Hant-TW',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        {/* Static site-wide defaults; per-route meta() overrides where needed. */}
        <meta name="keywords" content="所得稅,節稅,扣除額,綜合所得稅,114年度,2026 報稅,免稅額,試算" />
        <meta name="author" content="Taiwan Tax Calculator" />
        {/* `robots` is set per-route via meta() so /404 can declare noindex
            without producing two conflicting tags. */}
        {/* OG globals (route may override og:url / og:title / og:description / og:type) */}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="zh_TW" />
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href={createPublicAssetUrl('favicon.svg')} />
        {/* Per-route Meta + Links append here */}
        <Meta />
        <Links />
        {/* Site-wide JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {/* Cloudflare Web Analytics — free, cookieless, includes Core Web Vitals.
            Renders only when a token is configured (see siteConfig). */}
        {SITE_CONFIG.cloudflareAnalyticsToken ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${SITE_CONFIG.cloudflareAnalyticsToken}"}`}
          />
        ) : null}
      </body>
    </html>
  )
}

export default function Root() {
  // Hero image warmup moved to HomePage — warming from Root caused every page
  // (including /about, /deductions/*) to fetch the 468 KB Hero.svg.
  return <Outlet />
}

export function ErrorBoundary() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : 500
  const message =
    isRouteErrorResponse(error)
      ? error.statusText || '頁面發生錯誤'
      : error instanceof Error
        ? error.message
        : '未知錯誤'
  return (
    <main className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="text-5xl font-bold mb-4">{status}</h1>
      <p className="text-lg text-gray-600">{message}</p>
    </main>
  )
}

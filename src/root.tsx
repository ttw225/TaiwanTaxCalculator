import { Outlet, Scripts, ScrollRestoration, Meta, Links, isRouteErrorResponse, useRouteError } from 'react-router'
import { SITE_CONFIG } from './lib/siteConfig'
import './index.css'

const SITE_URL = SITE_CONFIG.siteUrl
const DEFAULT_OG_IMAGE = SITE_CONFIG.defaultOgImage
const SITE_NAME = SITE_CONFIG.name
const TAX_YEAR = SITE_CONFIG.taxYear

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
      logo: `${SITE_URL}/icon-512.png`,
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

export function Layout({ children }: { children: React.ReactNode }) {
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
        <meta property="og:image" content={DEFAULT_OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${SITE_NAME} — ${TAX_YEAR} 年度節稅清單`} />
        {/* Twitter globals */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
        <meta name="twitter:image:alt" content={`${SITE_NAME} — ${TAX_YEAR} 年度節稅清單`} />
        {/* Favicon / manifest */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
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
      </body>
    </html>
  )
}

export default function Root() {
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

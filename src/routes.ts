import { type RouteConfig, route, layout, index } from '@react-router/dev/routes'

// `/` is the public landing page. Checklist workflow state lives in URLs:
// `/checklist/start` for situation selection and `/checklist` for the
// fillable checklist, so refresh never has to repaint the landing page first.
export default [
  index('pages/HomePage.tsx'),
  route('checklist/start', 'pages/ChecklistStartPage.tsx'),
  route('checklist', 'pages/ChecklistPage.tsx'),
  layout('pages/SiteLayout.tsx', [
    route('payment-rewards', 'pages/PaymentRewardsPage.tsx'),
    route('about', 'pages/AboutPage.tsx'),
    route('methodology', 'pages/MethodologyPage.tsx'),
    route('deductions/:slug', 'pages/DeductionDetailPage.tsx'),
    // Explicit `/404` route so we can prerender a real 404.html with noindex
    // baked into the static HTML. Cloudflare `_redirects` fallback routes
    // unknown URLs here with HTTP 404 (no soft-404).
    route('404', 'pages/NotFoundPage.tsx', { id: 'not-found' }),
    route('*', 'pages/NotFoundPage.tsx', { id: 'splat-not-found' }),
  ]),
] satisfies RouteConfig

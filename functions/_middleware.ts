/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages middleware — preview / branch environment isolation.
 *
 * On *.pages.dev deployments (and any non-main branch preview), inject
 * `X-Robots-Tag: noindex, nofollow` so crawler bots never index preview builds.
 *
 * Production (main branch on custom domain) is left untouched; robots
 * directives are set per-route via <meta name="robots"> in prerendered HTML.
 */

interface Env {
  CF_PAGES_BRANCH?: string
}

export const onRequest: PagesFunction<Env> = async ({ request, next, env }) => {
  const response = await next()

  const host = new URL(request.url).hostname
  const branch = env.CF_PAGES_BRANCH ?? ''

  const isPreview =
    host.endsWith('.pages.dev') ||
    (branch !== '' && branch !== 'main')

  if (isPreview) {
    // Clone the response so we can mutate headers (Response is immutable)
    const mutable = new Response(response.body, response)
    mutable.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return mutable
  }

  return response
}

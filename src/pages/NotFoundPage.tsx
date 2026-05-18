import { Link } from 'react-router'

export function meta() {
  return [
    { title: '找不到頁面 404' },
    { name: 'robots', content: 'noindex,follow' },
  ]
}

export default function NotFoundPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="text-5xl font-bold mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-8">
        找不到這個頁面。可能是連結已失效或網址輸入錯誤。
      </p>
      <Link
        to="/"
        className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        回首頁
      </Link>
      {/* noindex meta will be injected in Phase C via per-route head config. */}
    </article>
  )
}

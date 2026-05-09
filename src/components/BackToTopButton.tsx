import { ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { animateScrollToY } from '../lib/scrollAnimation'

const SHOW_THRESHOLD_PX = 240

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > SHOW_THRESHOLD_PX)
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateVisibility)
    }
  }, [])

  function handleBackToTop() {
    animateScrollToY(0)
  }

  if (!visible) return null

  return (
    <button
      type="button"
      data-testid="back-to-top-btn"
      aria-label="回到頁面頂部"
      onClick={handleBackToTop}
      className="no-print fixed right-4 bottom-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-600 shadow-sm transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 md:right-6 md:bottom-6"
    >
      <ChevronUp size={18} aria-hidden="true" />
    </button>
  )
}

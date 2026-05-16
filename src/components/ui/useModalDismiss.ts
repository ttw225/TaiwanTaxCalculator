import { useEffect, useId } from 'react'

const layerStack: string[] = []

function registerLayer(id: string) {
  layerStack.push(id)
}

function unregisterLayer(id: string) {
  const index = layerStack.lastIndexOf(id)
  if (index >= 0) layerStack.splice(index, 1)
}

function isTopLayer(id: string) {
  return layerStack.at(-1) === id
}

/** Register Escape-to-dismiss; only the topmost modal layer handles the key. */
export function useModalDismiss(onDismiss: () => void, enabled = true): void {
  const layerId = useId()

  useEffect(() => {
    if (!enabled) return
    registerLayer(layerId)
    return () => unregisterLayer(layerId)
  }, [enabled, layerId])

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !isTopLayer(layerId)) return
      onDismiss()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, layerId, onDismiss])
}

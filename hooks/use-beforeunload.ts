import { useEffect } from 'react'

/**
 * Hook to warn users before leaving page with unsaved changes
 * @param hasUnsavedChanges - Whether there are unsaved changes
 */
export function useBeforeUnload(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers ignore custom messages, but we still need to set returnValue
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])
}

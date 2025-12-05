import { useEffect } from 'react'

export function useFormPersistence<T>(
  formData: T,
  storageKey: string,
  enabled: boolean = true
) {
  // Save to localStorage
  useEffect(() => {
    if (enabled && formData) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData))
      } catch (error) {
        console.error('Failed to save form data:', error)
      }
    }
  }, [formData, storageKey, enabled])

  // Load from localStorage
  const loadSavedData = (): T | null => {
    if (!enabled) return null
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Failed to load form data:', error)
      return null
    }
  }

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error('Failed to clear form data:', error)
    }
  }

  return { loadSavedData, clearSavedData }
}

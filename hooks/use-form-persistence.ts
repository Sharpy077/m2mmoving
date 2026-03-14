import { useEffect } from 'react'

interface PersistedEntry<T> {
  data: T
  savedAt: number
}

export function useFormPersistence<T>(
  formData: T,
  storageKey: string,
  enabled: boolean = true
) {
  // Save to localStorage with timestamp
  useEffect(() => {
    if (enabled && formData) {
      try {
        const entry: PersistedEntry<T> = { data: formData, savedAt: Date.now() }
        localStorage.setItem(storageKey, JSON.stringify(entry))
      } catch (error) {
        console.error('Failed to save form data:', error)
      }
    }
  }, [formData, storageKey, enabled])

  // Load from localStorage — returns data with _savedAt timestamp attached
  const loadSavedData = (): (T & { _savedAt?: number }) | null => {
    if (!enabled) return null
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      // Support new format { data, savedAt } and legacy flat format
      if (parsed && typeof parsed === 'object' && 'data' in parsed && 'savedAt' in parsed) {
        return { ...(parsed.data as T), _savedAt: parsed.savedAt as number }
      }
      return parsed as T
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

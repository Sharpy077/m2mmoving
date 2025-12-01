/**
 * Form validation utilities
 * Provides validation functions for common form fields
 */

export const validateEmail = (email: string): string | null => {
  if (!email || email.trim() === '') {
    return "Email is required"
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address"
  }
  return null
}

export const validatePhone = (phone: string, required: boolean = false): string | null => {
  if (!phone || phone.trim() === '') {
    return required ? "Phone number is required" : null
  }
  
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Australian phone formats:
  // Mobile: 04XX XXX XXX or +61 4XX XXX XXX
  // Landline: 0X XXXX XXXX or +61 X XXXX XXXX
  const mobileRegex = /^(?:\+61|0)4[0-9]{8}$/
  const landlineRegex = /^(?:\+61|0)[2-8][0-9]{8}$/
  
  if (!mobileRegex.test(cleaned) && !landlineRegex.test(cleaned)) {
    return "Please enter a valid Australian phone number (e.g., 04XX XXX XXX or (03) XXXX XXXX)"
  }
  
  return null
}

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`
  }
  return null
}

export const validateNumber = (value: string, min?: number, max?: number): string | null => {
  if (!value || value.trim() === '') {
    return null // Allow empty, use validateRequired if needed
  }
  const num = parseInt(value)
  if (isNaN(num)) {
    return "Please enter a valid number"
  }
  if (min !== undefined && num < min) {
    return `Must be at least ${min}`
  }
  if (max !== undefined && num > max) {
    return `Must be at most ${max}`
  }
  return null
}

export const validateDistance = (distance: string): string | null => {
  if (!distance || distance.trim() === '') {
    return null // Distance is optional
  }
  return validateNumber(distance, 0, 1000)
}

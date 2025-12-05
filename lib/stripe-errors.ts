/**
 * Stripe error message mapping
 * Converts technical Stripe error codes to user-friendly messages
 */

export const getStripeErrorMessage = (error: string): string => {
  const errorMap: Record<string, string> = {
    'card_declined': 'Your card was declined. Please try a different payment method or contact your bank.',
    'insufficient_funds': 'Insufficient funds. Please check your account balance or use a different card.',
    'expired_card': 'Your card has expired. Please use a different card.',
    'incorrect_cvc': 'The security code (CVC) is incorrect. Please check and try again.',
    'incorrect_number': 'The card number is incorrect. Please check and try again.',
    'processing_error': 'An error occurred while processing your payment. Please try again.',
    'generic_decline': 'Your card was declined. Please contact your bank or try a different payment method.',
    'lost_card': 'Your card was declined. Please contact your bank.',
    'stolen_card': 'Your card was declined. Please contact your bank.',
    'pickup_card': 'Your card was declined. Please contact your bank.',
    'restricted_card': 'Your card cannot be used for this transaction. Please contact your bank.',
    'security_violation': 'Your card was declined due to a security violation. Please contact your bank.',
    'service_not_allowed': 'This card type is not accepted. Please use a different card.',
    'stop_payment_order': 'Your card was declined. Please contact your bank.',
    'testmode_decline': 'This is a test card and cannot be used in live mode.',
    'try_again_later': 'Payment processing is temporarily unavailable. Please try again in a few minutes.',
    'authentication_required': 'Your card requires authentication. Please complete the verification process.',
    'card_not_supported': 'This card type is not supported. Please use a different card.',
    'currency_not_supported': 'This currency is not supported for this card.',
    'invalid_cvc': 'The security code (CVC) is invalid. Please check and try again.',
    'invalid_expiry_month': 'The expiration month is invalid.',
    'invalid_expiry_year': 'The expiration year is invalid.',
    'invalid_number': 'The card number is invalid. Please check and try again.',
    'rate_limit': 'Too many requests. Please wait a moment and try again.',
  }

  // Try to match error code (case insensitive)
  const lowerError = error.toLowerCase()
  
  for (const [code, message] of Object.entries(errorMap)) {
    if (lowerError.includes(code)) {
      return message
    }
  }

  // Check for common error patterns
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return 'Network error. Please check your internet connection and try again.'
  }

  if (lowerError.includes('timeout')) {
    return 'Request timed out. Please try again.'
  }

  if (lowerError.includes('unauthorized') || lowerError.includes('401')) {
    return 'Authentication failed. Please refresh the page and try again.'
  }

  if (lowerError.includes('forbidden') || lowerError.includes('403')) {
    return 'Access denied. Please contact support if this issue persists.'
  }

  if (lowerError.includes('not found') || lowerError.includes('404')) {
    return 'Payment service unavailable. Please try again later or contact support.'
  }

  if (lowerError.includes('server error') || lowerError.includes('500')) {
    return 'Server error. Please try again in a few moments or contact support.'
  }

  // Default message
  return 'Payment failed. Please try again or contact support at 03 8820 1801.'
}

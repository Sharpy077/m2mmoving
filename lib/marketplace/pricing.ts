/**
 * Marketplace Pricing Utilities
 * Fee calculation and revenue split logic for the marketplace
 */

import type { MarketplaceFees } from './types'

/**
 * Calculates the platform fee and provider payout from the customer price.
 *
 * @param customer_price - Total amount charged to the customer (AUD)
 * @param commission_rate - Platform commission as a decimal (e.g. 0.15 for 15%)
 * @returns MarketplaceFees breakdown
 */
export function calculateMarketplaceFees({
  customer_price,
  commission_rate,
}: {
  customer_price: number
  commission_rate: number
}): MarketplaceFees {
  if (customer_price <= 0) {
    throw new Error('customer_price must be greater than 0')
  }

  const platform_fee = Math.round(customer_price * commission_rate * 100) / 100
  const provider_payout = Math.round((customer_price - platform_fee) * 100) / 100

  return {
    customer_price,
    platform_fee,
    provider_payout,
    commission_rate,
  }
}

/**
 * Formats a dollar amount as AUD string (e.g. $4,250.00)
 */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

/**
 * Calculates the customer-facing price including the platform commission on top of a provider's base price.
 * Used when we want the customer to effectively bear the commission cost.
 *
 * customer_price = provider_base / (1 - commission_rate)
 */
export function grossUpProviderPrice({
  provider_base,
  commission_rate,
}: {
  provider_base: number
  commission_rate: number
}): number {
  if (commission_rate >= 1) throw new Error('commission_rate must be less than 1')
  return Math.round((provider_base / (1 - commission_rate)) * 100) / 100
}

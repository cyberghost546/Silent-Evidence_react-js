// ---------------------------------------------------------------
// PAYMENTS: Pro and tips ("candles"). Django side: backend/payments/.
//
// Part of the API "client" - components import from api/client.js.
// ---------------------------------------------------------------
import { getJSON, authRequest } from './core'


// The prices + "how do payments work right now" (anyone can ask):
// { mode: 'stripe' | 'fake' | 'off', currency: 'EUR',
//   plans: [{ kind, label, price }], tip_amounts: ['1.00', ...],
//   site_cut_percent: 10, me: { is_pro, pro_ends_at } or null }
export function getPaymentPlans() {
    return getJSON('/api/payments/plans/')
}

// Start paying. Answers { url, payment_id } - send the browser to `url`
// (Stripe's payment page, or our fake one on your computer).
//   Pro: startCheckout({ kind: 'pro_monthly' })
//   Tip: startCheckout({ kind: 'tip', story_id: 5, amount: '3.00', message: '...' })
export function startCheckout(details) {
    return authRequest('/api/payments/checkout/', 'POST', details)
}

// { id, kind, amount, status: 'pending' | 'paid', story_id, story_title, writer }
export function getPayment(id) {
    return authRequest(`/api/payments/${id}/`)
}

// Only works in fake mode (your computer, no Stripe key).
export function fakePay(id) {
    return authRequest(`/api/payments/${id}/fake-pay/`, 'POST')
}

// A writer's candles: { count, earned, waiting, site_cut_percent, recent: [...] }
export function getTipsReceived() {
    return authRequest('/api/payments/tips/received/')
}

// --- Admins ---

// { writers: [{ writer_id, writer, tips, owed }], tips_total, site_cut_total, tip_count }
export function getTipsOwed() {
    return authRequest('/api/dashboard/tips-owed/')
}

export function markTipsPaidOut(writerId) {
    return authRequest('/api/dashboard/tips-owed/', 'POST', { writer_id: writerId })
}

// (To show a price: formatMoney('3.99', 'EUR') from utils/format.js.)

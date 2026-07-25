// Wallet — API client.
import { fetchApi } from '../config';

/** { balance, points_per_inr, commission_percent, payments_enabled } */
export async function getWallet() {
  const r = await fetchApi('/api/wallet/balance.php');
  return r.data;
}

export async function getTransactions(limit = 50) {
  const r = await fetchApi(`/api/wallet/transactions.php?limit=${limit}`);
  return r.data?.transactions || [];
}

/** Create a Razorpay order for a top-up (needs Razorpay keys on the server). */
export async function createTopupOrder(amountInr) {
  const r = await fetchApi('/api/wallet/topup-create-order.php', {
    method: 'POST',
    body: JSON.stringify({ amount_inr: amountInr }),
  });
  return r.data; // { order_id, amount_paise, currency, key_id, points }
}

/** Verify a completed Razorpay payment → credits points. */
export async function verifyTopup({ orderId, paymentId, signature }) {
  const r = await fetchApi('/api/wallet/topup-verify.php', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature }),
  });
  return r.data; // { balance, points }
}

// Minimal Razorpay Orders API client — deliberately not the razorpay npm SDK,
// just two HTTP calls, consistent with this codebase's preference for direct
// calls over heavy dependencies (see server/abdmProviders/* for the same
// approach). Node's built-in fetch (Node 18+) is used, no extra install.
const crypto = require("crypto");

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const token = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

// amountRupees: decimal rupees (e.g. 500.50) — Razorpay's Orders API takes the
// smallest currency unit (paise), so this rounds to the nearest paisa.
async function createOrder(amountRupees, receipt, notes) {
  if (!isConfigured()) {
    throw new Error("Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.");
  }
  const amountPaise = Math.round(Number(amountRupees) * 100);
  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes: notes || {} }),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.description || `Razorpay order creation failed (HTTP ${res.status}).`;
    throw new Error(message);
  }
  return data; // { id, amount, currency, receipt, status, ... }
}

// Razorpay's documented Checkout success signature: HMAC-SHA256 of
// "<order_id>|<payment_id>" using the key secret, compared to what Checkout
// returned. This is the only trustworthy proof a payment actually succeeded —
// everything else in the success callback is client-reported and unverified.
function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!isConfigured()) {
    throw new Error("Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.");
  }
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // Constant-time compare — both sides are always same-length hex digests, so
  // this never throws on length mismatch the way timingSafeEqual normally would.
  return (
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}

module.exports = { isConfigured, createOrder, verifyPaymentSignature };

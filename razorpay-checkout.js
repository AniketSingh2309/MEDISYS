// Shared Razorpay Checkout wiring for every "collect payment" flow that
// isn't telemedicine (pharmacy invoices, blood bank billing, billing desk
// bills — see patient/appointments.js for the telemedicine-specific one,
// which also has to book the visit itself, not just record a payment).
//
// Usage:
//   MedisysPayments.payViaRazorpay({
//     createOrderUrl: `/api/pharmacy-invoices/${id}/create-order`,
//     verifyUrl: `/api/pharmacy-invoices/${id}/verify-payment`,
//     name: "MEDISYS Pharmacy",
//     description: `Invoice #${invoiceNumber}`,
//   }).then(onSuccess).catch(onErrorOrDismiss);
//
// The returned promise rejects with a special DISMISSED error (check
// `err.dismissed === true`) when the user just closes the checkout dialog —
// callers should treat that as "nothing happened", not a real failure.
(function () {
  function payViaRazorpay({ createOrderUrl, createOrderBody, verifyUrl, name, description }) {
    return new Promise((resolve, reject) => {
      if (typeof Razorpay === "undefined") {
        reject(new Error("Payment page failed to load. Check your connection and try again."));
        return;
      }

      fetch(createOrderUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(createOrderBody || {}),
      })
        .then((r) => r.json())
        .then((orderData) => {
          if (!orderData.success) {
            reject(new Error(orderData.message || "Could not start payment."));
            return;
          }

          const rzp = new Razorpay({
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            order_id: orderData.orderId,
            name: name || "MEDISYS",
            description: description || "",
            theme: { color: "#1b2f6e" },
            handler: (response) => {
              fetch(verifyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              })
                .then((r) => r.json())
                .then((verifyData) => {
                  if (!verifyData.success) {
                    reject(new Error(verifyData.message || "Payment succeeded but could not be confirmed. Contact support."));
                    return;
                  }
                  resolve(verifyData);
                })
                .catch(reject);
            },
            modal: {
              ondismiss: () => {
                const err = new Error("Payment window closed.");
                err.dismissed = true;
                reject(err);
              },
            },
          });
          rzp.on("payment.failed", (resp) => {
            reject(new Error("Payment failed: " + (resp.error?.description || "Please try again.")));
          });
          rzp.open();
        })
        .catch(reject);
    });
  }

  window.MedisysPayments = { payViaRazorpay };
})();

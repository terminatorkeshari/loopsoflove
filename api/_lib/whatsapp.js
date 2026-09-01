// Sends a WhatsApp message to the store owner when an order comes in.
// Deliberately fire-and-forget from the caller's perspective: if
// WhatsApp isn't configured yet, or Meta's API is briefly down, this
// must NEVER cause an order to fail — the order already exists in
// the database by the time this runs. This is a notification, not
// the system of record.
async function sendOrderWhatsapp(order, recipientNumber) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId || !recipientNumber) {
    // Not configured yet — this is expected until Meta Business
    // verification is complete. Silently skip.
    return;
  }

  const digits = String(recipientNumber).replace(/\D/g, '');
  if (!digits) return;

  const itemsText = (order.items || []).map(i => `• ${i.name} ×${i.qty}`).join('\n');
  const message =
    `🔔 New order #${order.order_number}\n\n` +
    `${order.customer_name} — ${order.phone}\n` +
    `${order.address}\n\n` +
    `${itemsText}\n\n` +
    `Total (COD): ₹${order.total}`;

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: message },
      }),
    });
    if (!res.ok) {
      console.error('WhatsApp send failed:', await res.text());
    }
  } catch (err) {
    console.error('WhatsApp send error:', err);
  }
}

module.exports = { sendOrderWhatsapp };

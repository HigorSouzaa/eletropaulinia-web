import NotificationOutbox from '../models/NotificationOutbox.js';
import Order from '../models/OrderV2.js';

function config() {
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId,
    WHATSAPP_GRAPH_VERSION: version, WHATSAPP_OPENING_TEMPLATE: template } = process.env;
  if (!token || !/^\d+$/.test(phoneId || '') || !/^v\d+\.\d+$/.test(version || '') || !/^[a-z0-9_]+$/.test(template || '')) return null;
  return { token, phoneId, version, template };
}

export async function dispatchOpening(id, fetchImpl = fetch) {
  const settings = config();
  if (!settings) return { state: 'not_configured' };
  // The claim happens before the external call. A lost response remains uncertain,
  // never an automatic retry that could send a duplicate message.
  const item = await NotificationOutbox.findOneAndUpdate({ _id: id, state: 'pending' },
    { $set: { state: 'uncertain', attemptedAt: new Date() } }, { new: true }).lean();
  if (!item) return { state: 'not_pending' };
  const order = await Order.findById(item.orderId).select('comunicacao').lean();
  if (!order?.comunicacao?.whatsapp?.autorizado) {
    await NotificationOutbox.updateOne({ _id: id, state: 'uncertain' }, { $set: { state: 'failed' } });
    return { state: 'failed' };
  }
  const body = { messaging_product: 'whatsapp', to: item.phone.replace(/^\+/, ''), type: 'template',
    template: { name: settings.template, language: { code: 'pt_BR' }, components: [{ type: 'body', parameters: [
      { type: 'text', text: item.customerName }, { type: 'text', text: item.orderNumber },
      { type: 'text', text: item.entryDate.split('-').reverse().join('/') },
    ] }] } };
  try {
    const response = await fetchImpl(`https://graph.facebook.com/${settings.version}/${settings.phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${settings.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const result = await response.json();
      const messageId = result?.messages?.[0]?.id;
      if (typeof messageId === 'string' && messageId.length <= 256) {
        await NotificationOutbox.updateOne({ _id: id, state: 'uncertain' },
          { $set: { state: 'accepted', acceptedAt: new Date(), providerMessageId: messageId } });
        return { state: 'accepted' };
      }
    }
    if ([400, 401, 403, 404].includes(response.status)) {
      await NotificationOutbox.updateOne({ _id: id, state: 'uncertain' }, { $set: { state: 'failed' } });
      return { state: 'failed' };
    }
  } catch { /* A request may have reached Meta; do not retry automatically. */ }
  return { state: 'uncertain' };
}

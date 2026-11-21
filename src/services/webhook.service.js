const db = require('../config/db');

/**
 * Trigger outgoing webhooks for a specific event
 */
exports.triggerWebhooks = async (enterpriseId, eventName, payload) => {
  try {
    // Find active outgoing webhooks listening for this event
    const [rows] = await db.query(
      `SELECT * FROM webhooks 
       WHERE enterprise_id = ? AND is_active = 1 
         AND url NOT LIKE 'https://api.aminoid.com/incoming/%' 
         AND (JSON_CONTAINS(events, ?) OR JSON_LENGTH(events) = 0)`,
      [enterpriseId, JSON.stringify(eventName)]
    );

    if (rows.length === 0) return;

    // Fire webhooks asynchronously
    rows.forEach(async (webhook) => {
      const startTime = Date.now();
      let isSuccess = false;
      let responseStatus = null;
      let responseBody = null;

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (webhook.secret) {
          headers['x-aminoid-signature'] = webhook.secret;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const res = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ event: eventName, payload }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        responseStatus = res.status;
        isSuccess = res.ok;
        responseBody = await res.text();
      } catch (err) {
        responseBody = err.message || 'Request failed';
      }

      const durationMs = Date.now() - startTime;

      // Log the delivery
      await db.query(
        `INSERT INTO webhook_logs 
         (webhook_id, enterprise_id, event, payload, response_status, response_body, is_success, duration_ms) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          webhook.id, 
          enterpriseId, 
          eventName, 
          JSON.stringify(payload), 
          responseStatus, 
          responseBody ? responseBody.substring(0, 1000) : null, 
          isSuccess ? 1 : 0, 
          durationMs
        ]
      );
    });

  } catch (err) {
    console.error('Error triggering webhooks:', err);
  }
};

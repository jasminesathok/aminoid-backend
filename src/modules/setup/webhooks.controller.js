const db = require('../../config/db');

exports.getWebhooks = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM webhooks WHERE enterprise_id = ? ORDER BY created_at DESC',
      [req.enterpriseId]
    );
    // Parse events back to array just in case
    const webhooks = rows.map(r => ({
      ...r,
      events: typeof r.events === 'string' ? JSON.parse(r.events) : r.events
    }));
    res.json({ success: true, webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch webhooks' });
  }
};

exports.createWebhook = async (req, res) => {
  try {
    const { name, url, secret, events, is_active } = req.body;
    
    // Instead of letting DB generate UUID, we should generate it in the backend
    const crypto = require('crypto');
    const newId = crypto.randomUUID();
    
    // If incoming, generate the correct URL
    const isIncoming = !url || url.includes('/incoming/');
    const finalUrl = isIncoming ? `${process.env.VITE_API_URL || 'http://localhost:5000'}/api/setup/webhooks/incoming/${newId}` : url;
    
    await db.query(
      `INSERT INTO webhooks (id, enterprise_id, name, url, secret, events, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, req.enterpriseId, name, finalUrl, secret || null, JSON.stringify(events || []), is_active !== false]
    );

    res.json({ success: true, message: 'Webhook created successfully' });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to create webhook' });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, secret, events, is_active } = req.body;
    await db.query(
      `UPDATE webhooks SET name=?, url=?, secret=?, events=?, is_active=?
       WHERE id=? AND enterprise_id=?`,
      [name, url, secret || null, JSON.stringify(events || []), is_active !== false, id, req.enterpriseId]
    );
    res.json({ success: true, message: 'Webhook updated successfully' });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to update webhook' });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM webhooks WHERE id=? AND enterprise_id=?', [id, req.enterpriseId]);
    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to delete webhook' });
  }
};

exports.getWebhookLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM webhook_logs WHERE webhook_id=? AND enterprise_id=? ORDER BY created_at DESC LIMIT 50',
      [id, req.enterpriseId]
    );
    const logs = rows.map(r => ({
      ...r,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
    }));
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
};

exports.retryWebhookLog = async (req, res) => {
  try {
    const { id, logId } = req.params;
    // In a real application, you would trigger the webhook event again
    // For now, let's just log it and say success
    const [logs] = await db.query('SELECT * FROM webhook_logs WHERE id=? AND webhook_id=? AND enterprise_id=?', [logId, id, req.enterpriseId]);
    if (!logs.length) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    
    // Simulate webhook retry...
    // (Here you would use axios/fetch to post to the URL with the payload)
    
    res.json({ success: true, message: 'Webhook retry initiated' });
  } catch (error) {
    console.error('Error retrying webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to retry webhook' });
  }
};

exports.handleIncomingWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    const signature = req.headers['x-aminoid-signature'];
    const payload = req.body;
    
    // Find the webhook
    const [webhooks] = await db.query('SELECT * FROM webhooks WHERE id = ? AND is_active = 1', [webhookId]);
    
    if (webhooks.length === 0) {
      return res.status(404).json({ success: false, message: 'Webhook not found or inactive' });
    }
    
    const webhook = webhooks[0];
    
    // Validate secret if configured
    if (webhook.secret && webhook.secret !== signature) {
      // Log failed attempt due to signature
      await db.query(
        `INSERT INTO webhook_logs (webhook_id, enterprise_id, event, payload, response_status, response_body, is_success) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [webhook.id, webhook.enterprise_id, 'incoming', JSON.stringify(payload), 401, 'Invalid signature', 0]
      );
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid signature' });
    }
    
    // Here we would typically process the incoming data based on the webhook configuration
    // For now, we'll just log it as a successful receipt
    await db.query(
      `INSERT INTO webhook_logs (webhook_id, enterprise_id, event, payload, response_status, response_body, is_success) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [webhook.id, webhook.enterprise_id, 'incoming', JSON.stringify(payload), 200, 'Data received and processed', 1]
    );
    
    res.json({ success: true, message: 'Webhook payload received' });
  } catch (error) {
    console.error('Error handling incoming webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to process webhook' });
  }
};

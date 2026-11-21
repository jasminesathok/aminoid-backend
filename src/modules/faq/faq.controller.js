const FAQ = require('../../models/FAQ');

const getFAQ = async (req, res) => {
  try {
    const [r] = await FAQ.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getFAQ error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getFAQItem = async (req, res) => {
  try {
    const [r] = await FAQ.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'FAQ item not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('getFAQItem error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getFAQ, getFAQItem };

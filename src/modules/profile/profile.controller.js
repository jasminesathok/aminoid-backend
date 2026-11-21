const bcrypt = require('bcryptjs');
const User = require('../../models/User');

const getProfile = (req, res) => res.json({ success: true, data: req.user });

const updateProfile = async (req, res) => {
  const { firstName, lastName, avatar } = req.body;
  try {
    await User.update(req.user.id, { firstName, lastName, avatar });
    const [r] = await User.findById(req.user.id);
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, message: 'Both currentPassword and newPassword are required' });
  try {
    const [rows] = await User.findByIdFull(req.user.id);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(req.user.id, hashed);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('updatePassword error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getProfile, updateProfile, updatePassword };

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../../models/User');
const db     = require('../../config/db');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_amnoid_jwt_token_key_2026_xyz', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const generateReferralCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code, isUnique = false;
  while (!isUnique) {
    code = 'AMN' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const [rows] = await db.query('SELECT id FROM users WHERE referral_code = ?', [code]);
    isUnique = rows.length === 0;
  }
  return code;
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  try {
    let [rows] = await User.findByEmail(email.toLowerCase());
    let user = rows[0];

    // Fallback: check if the identifier is an employee code
    if (!user) {
      const [userRows] = await db.query(
        'SELECT u.* FROM users u JOIN employees e ON u.id = e.user_id WHERE e.employee_code = ?',
        [email]
      );
      user = userRows[0];
    }

    if (!user) return res.status(401).json({ success: false, message: 'Invalid email/ID or password' });


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const { password: _pw, ...safeUser } = user;
    res.json({ success: true, token: generateToken(user.id), user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/signup
const signup = async (req, res) => {
  const { firstName, lastName, email, password, role, companyName } = req.body;

  // super_admin cannot self-register via public signup
  const assignedRole = ['member', 'admin'].includes(role) ? role : 'member';

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  if (assignedRole === 'admin' && !companyName)
    return res.status(400).json({ success: false, message: 'Company name is required' });

  if (assignedRole === 'member' && (!firstName || !lastName))
    return res.status(400).json({ success: false, message: 'First name and last name are required' });

  try {
    const [exists] = await User.findByEmail(email.toLowerCase());
    if (exists.length)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    let createPayload = { email, hashedPassword, role: assignedRole };

    if (assignedRole === 'admin') {
      const now      = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      createPayload = {
        ...createPayload,
        firstName:          companyName,
        lastName:           null,
        companyName,
        referralCode:       await generateReferralCode(),
        subscriptionStatus: 'TRIAL',
        trialStartAt:       now,
        trialEndAt:         trialEnd,
        kycStatus:          'PENDING',
        enterpriseId:       null, // admin IS the enterprise root
      };
    } else {
      // member must supply enterpriseId (admin's user id) during signup
      const { enterpriseId } = req.body;
      createPayload = { ...createPayload, firstName, lastName, enterpriseId: enterpriseId ?? null };
    }

    const id     = await User.create(createPayload);
    const [rows] = await User.findById(id);
    res.status(201).json({ success: true, token: generateToken(id), user: rows[0] });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/auth/me
const getMe = (req, res) => res.json({ success: true, user: req.user });

// POST /api/auth/logout
const logout = (_req, res) => res.json({ success: true, message: 'Logged out successfully' });

module.exports = { login, signup, getMe, logout };

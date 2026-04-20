const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Team = require('./models/Team');

const app = express();
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/brandpulse';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_fallback';
const PEEC_CLIENT_ID = process.env.PEEC_CLIENT_ID || 'mock_client_id';
const PEEC_CLIENT_SECRET = process.env.PEEC_CLIENT_SECRET || 'mock_client_secret';
const PEEC_REDIRECT_URI = process.env.PEEC_REDIRECT_URI || `http://127.0.0.1:5050/api/peec/callback`;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('teamId');
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email,
        team: user.teamId ? { id: user.teamId._id, companyName: user.teamId.companyName } : null,
        hasPeecAccess: !!user.mcpAccessToken
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- TEAM ROUTES ---
app.post('/api/team', authenticateToken, async (req, res) => {
  try {
    const { companyName } = req.body;
    const team = new Team({ companyName, members: [req.user.userId] });
    await team.save();
    await User.findByIdAndUpdate(req.user.userId, { teamId: team._id });
    
    res.status(201).json({ message: 'Team created successfully', team });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- PEEC AI OAuth ROUTES ---
app.get('/api/peec/auth', authenticateToken, (req, res) => {
  // 1. Generate standard oauth URL pointing to Peec.ai
  // In a real app we pass `state` containing the user's JWT so we can identify them on callback
  const state = jwt.sign({ userId: req.user.userId }, JWT_SECRET, { expiresIn: '15m' });
  
  const authUrl = new URL('https://app.peec.ai/oauth/authorize');
  authUrl.searchParams.append('client_id', PEEC_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', PEEC_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'mcp.read mcp.write');
  authUrl.searchParams.append('state', state);

  res.json({ url: authUrl.toString() });
});

app.get('/api/peec/callback', async (req, res) => {
  const { code, state } = req.query;
  
  try {
    // Determine which user just authenticated
    const decoded = jwt.verify(state, JWT_SECRET);
    const userId = decoded.userId;

    // 2. Exchange the authorization code for an Access Token
    // We mock the fetch to Peec here since we don't have real valid client credentials
    /*
    const tokenRes = await fetch('https://api.peec.ai/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PEEC_CLIENT_ID,
        client_secret: PEEC_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: PEEC_REDIRECT_URI
      })
    });
    const tokenData = await tokenRes.json();
    */

    // Simulate successful OAuth exchange
    const mockAccessToken = `peec_acc_${Math.random().toString(36).substr(2, 9)}`;
    const mockRefreshToken = `peec_ref_${Math.random().toString(36).substr(2, 9)}`;

    await User.findByIdAndUpdate(userId, { 
      mcpAccessToken: mockAccessToken,
      mcpRefreshToken: mockRefreshToken
    });

    // 3. Redirect back to the frontend app securely
    res.redirect('http://127.0.0.1:5173/?peec_auth=success');

  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.redirect('http://127.0.0.1:5173/?peec_auth=failed');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

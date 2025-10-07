const express = require('express');
const router = express.Router();
const History = require('../models/History');
const User = require('../models/User');

// POST /api/history - Add a history item
router.post('/history', async (req, res) => {
  try {
    const { email, book } = req.body;
    if (!email || !book || !book._id) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    // Create history document with user_id
    const history = new History({
      user_id: user._id,
      username: user.username,
      useremail: user.email,
      book_id: book._id,
      bookname: book.title,
      action: 'completed',
      timestamp: new Date(),
      rating: book.rating || undefined
    });
    await history.save();
    res.status(201).json({ success: true, history });
  } catch (error) {
    console.error('Error adding history:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/history/:email - Get user's watch history
router.get('/history/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required.' });
    }
    // Find user by email
    const User = require('../models/User');
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    // Find histories for user
    const histories = await History.find({ user_id: user._id }).populate('book_id');
    res.json({ success: true, histories });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;

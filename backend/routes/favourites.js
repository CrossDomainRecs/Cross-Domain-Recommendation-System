const express = require('express');
const router = express.Router();
const Favourite = require('../models/Favourite');
const User = require('../models/User');

// POST /api/favourites - Save or update user's favourite genres
router.post('/favourites', async (req, res) => {
  try {
    const { email, genres } = req.body;

    if (!email || !genres || !Array.isArray(genres)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and genres array are required.' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Check if favourite genres already exist for this user
    let favourite = await Favourite.findOne({ useremail: email });

    if (favourite) {
      // Update existing favourite genres
      favourite.genres = genres;
      favourite.updated_at = Date.now();
      await favourite.save();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Favourite genres updated successfully.',
        favourite 
      });
    } else {
      // Create new favourite genres entry
      favourite = new Favourite({
        username: user.username,
        useremail: user.email,
        genres: genres
      });
      
      await favourite.save();
      
      return res.status(201).json({ 
        success: true, 
        message: 'Favourite genres saved successfully.',
        favourite 
      });
    }
  } catch (error) {
    console.error('Error saving favourite genres:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while saving favourite genres.' 
    });
  }
});

// GET /api/favourites/:email - Get user's favourite genres
router.get('/favourites/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required.' 
      });
    }

    const favourite = await Favourite.findOne({ useremail: email });

    if (!favourite) {
      return res.status(404).json({ 
        success: false, 
        message: 'No favourite genres found for this user.' 
      });
    }

    res.json({ 
      success: true, 
      favourite 
    });
  } catch (error) {
    console.error('Error fetching favourite genres:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching favourite genres.' 
    });
  }
});

module.exports = router;

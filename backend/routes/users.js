const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const User = require('../models/User');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profiles/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// ✅ User profile routes (authenticated users)
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.delete('/profile', authenticateToken, userController.deleteAccount);
router.post('/profile/photo', authenticateToken, upload.single('profilePicture'), userController.uploadProfilePicture);

// ✅ DRL genre update endpoint (for ML service)
router.post('/drl-genres', userController.updateDRLGenres);

// ✅ Admin routes
router.get('/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: user.toJSON(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'USER_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
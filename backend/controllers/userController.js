const User = require('../models/User');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
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
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'PROFILE_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const allowedUpdates = ['username', 'profilePicture', 'preferences'];
        const updates = {};
        
        // Filter allowed updates
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        // Handle password update separately
        if (req.body.password && req.body.currentPassword) {
            const user = await User.findById(req.user.userId).select('+password');
            
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

            // Verify current password
            const isPasswordValid = await user.comparePassword(req.body.currentPassword);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_PASSWORD',
                        message: 'Current password is incorrect'
                    },
                    timestamp: new Date().toISOString()
                });
            }

            // Update password
            user.password = req.body.password;
            await user.save();
            
            return res.json({
                success: true,
                data: user.toJSON(),
                message: 'Password updated successfully',
                timestamp: new Date().toISOString()
            });
        }

        // Handle preferences merge for DRL
        if (updates.preferences) {
            const user = await User.findById(req.user.userId);
            
            // Merge preferences intelligently
            updates.preferences = {
                ...user.preferences,
                ...updates.preferences,
                // Keep DRL learned genres separate
                drl_learned_genres: user.preferences.drl_learned_genres || [],
                // Combine user selected with favorite genres
                favorite_genres: updates.preferences.user_selected_genres || 
                                updates.preferences.favorite_genres || 
                                user.preferences.favorite_genres
            };
        }
        
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true, runValidators: true }
        );
        
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
            message: 'Profile updated successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'NO_FILE',
                    message: 'No file uploaded'
                },
                timestamp: new Date().toISOString()
            });
        }

        // Generate file URL
        const fileUrl = `/uploads/profiles/${req.file.filename}`;

        // Update user's profile picture
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { profilePicture: fileUrl },
            { new: true }
        );

        if (!user) {
            // Delete uploaded file if user not found
            await fs.unlink(req.file.path);
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
            data: {
                profilePicture: fileUrl,
                user: user.toJSON()
            },
            message: 'Profile picture uploaded successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Upload profile picture error:', error);
        // Clean up file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'UPLOAD_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Delete account
exports.deleteAccount = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.user.userId);

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

        // Delete profile picture if exists
        if (user.profilePicture) {
            const filePath = path.join(__dirname, '..', user.profilePicture);
            await fs.unlink(filePath).catch(console.error);
        }

        res.json({
            success: true,
            message: 'Account deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Update DRL learned genres (called by ML service)
exports.updateDRLGenres = async (req, res) => {
    try {
        const { userId, learned_genres, genre_weights } = req.body;

        if (!userId || !learned_genres) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'userId and learned_genres are required'
                },
                timestamp: new Date().toISOString()
            });
        }

        const user = await User.findById(userId);

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

        // Update DRL learned genres
        user.preferences.drl_learned_genres = learned_genres;
        
        // Merge with user selected genres for favorite_genres
        const combinedGenres = new Set([
            ...user.preferences.user_selected_genres,
            ...learned_genres
        ]);
        user.preferences.favorite_genres = Array.from(combinedGenres);

        // Update genre weights if provided
        if (genre_weights) {
            user.preferences.genre_weights = genre_weights;
        }

        await user.save();

        res.json({
            success: true,
            data: user.toJSON(),
            message: 'DRL genres updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Update DRL genres error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

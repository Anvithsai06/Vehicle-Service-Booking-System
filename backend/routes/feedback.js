const express = require('express');
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Add Feedback (Customer only)
router.post('/', auth, authorize('customer'), async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    // Check if booking exists and belongs to user
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Allow feedback for both Confirmed and Completed bookings
    if (booking.status !== 'Completed' && booking.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Can only provide feedback for confirmed or completed bookings' });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ bookingId });
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already provided for this booking' });
    }

    const feedback = new Feedback({
      bookingId,
      userId: req.user.userId,
      rating,
      comment: comment || ''
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback added successfully', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Error adding feedback', error: error.message });
  }
});

// Get Feedback by Booking ID (returns null if not found, doesn't error)
router.get('/booking/:bookingId', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ bookingId: req.params.bookingId });
    
    if (!feedback) {
      // Return empty feedback instead of 404 to avoid errors in frontend
      return res.json({ feedback: null });
    }
    
    await feedback.populate('userId', 'name');
    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feedback', error: error.message });
  }
});

// Get Feedback for Service Center (Garage Owner only)
router.get('/center/:centerId', auth, authorize('garage'), async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const Booking = require('../models/Booking');
    
    // Get all bookings for this center
    const bookings = await Booking.find({ centerId: req.params.centerId });
    const bookingIds = bookings.map(b => b.bookingId);
    
    if (bookingIds.length === 0) {
      return res.json({ feedbacks: [] });
    }
    
    // Get all feedback for these bookings
    const placeholders = bookingIds.map(() => '?').join(',');
    const [feedbacks] = await pool.execute(
      `SELECT * FROM feedback WHERE bookingId IN (${placeholders})`,
      bookingIds
    );
    
    // Populate feedback with user and booking details
    const feedbacksData = await Promise.all(feedbacks.map(async (feedback) => {
      const feedbackObj = new Feedback(feedback);
      await feedbackObj.populate('userId', 'name email');
      await feedbackObj.populate('bookingId', 'bookingId serviceType date status');
      
      // Get booking details
      const booking = bookings.find(b => b.bookingId === feedback.bookingId);
      
      return {
        feedbackId: feedbackObj.feedbackId,
        bookingId: typeof feedbackObj.bookingId === 'object' ? feedbackObj.bookingId : { bookingId: feedbackObj.bookingId },
        userId: feedbackObj.userId,
        rating: feedbackObj.rating,
        comment: feedbackObj.comment,
        createdAt: feedbackObj.createdAt,
        updatedAt: feedbackObj.updatedAt,
        bookingDetails: booking ? {
          serviceType: booking.serviceType,
          date: booking.date,
          status: booking.status
        } : null
      };
    }));
    
    res.json({ feedbacks: feedbacksData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feedback', error: error.message });
  }
});

module.exports = router;


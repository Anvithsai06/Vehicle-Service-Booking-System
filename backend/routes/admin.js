const express = require('express');
const Booking = require('../models/Booking');
const ServiceCenter = require('../models/ServiceCenter');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { auth, authorize } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// All admin routes require admin role
router.use(auth);
router.use(authorize('admin'));

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    // Get total counts
    const [usersCount] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role != "admin"');
    const [centersCount] = await pool.execute('SELECT COUNT(*) as count FROM serviceCenters');
    const [bookingsCount] = await pool.execute('SELECT COUNT(*) as count FROM bookings');
    const [feedbackCount] = await pool.execute('SELECT COUNT(*) as count FROM feedback');
    const [pendingCentersCount] = await pool.execute('SELECT COUNT(*) as count FROM serviceCenters WHERE approvalStatus = "pending" OR approvalStatus IS NULL');
    
    // Get booking status breakdown
    const [bookingStats] = await pool.execute(`
      SELECT status, COUNT(*) as count 
      FROM bookings 
      GROUP BY status
    `);
    
    res.json({
      stats: {
        totalUsers: usersCount[0].count,
        totalCenters: centersCount[0].count,
        totalBookings: bookingsCount[0].count,
        totalFeedback: feedbackCount[0].count,
        pendingApprovals: pendingCentersCount[0].count,
        bookingBreakdown: bookingStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// Get All Service History (All Bookings)
router.get('/service-history', async (req, res) => {
  try {
    const bookings = await Booking.find();
    
    // Populate related data
    for (const booking of bookings) {
      await booking.populate('userId', 'name email contact');
      await booking.populate('vehicleId', 'registrationNumber model type');
      await booking.populate('centerId', 'name address contact');
    }
    
    const bookingsData = bookings.map(booking => ({
      bookingId: booking.bookingId,
      userId: booking.userId,
      vehicleId: booking.vehicleId,
      centerId: booking.centerId,
      serviceType: booking.serviceType,
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status,
      remarks: booking.remarks,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));
    
    res.json({ bookings: bookingsData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service history', error: error.message });
  }
});

// Get All Service Centers (with approval status)
router.get('/service-centers', async (req, res) => {
  try {
    const centers = await ServiceCenter.find();
    await ServiceCenter.populateAll(centers, 'ownerId', 'name email contact');
    
    const centersData = centers.map(center => ({
      centerId: center.centerId,
      ownerId: center.ownerId,
      name: center.name,
      address: center.address,
      contact: center.contact,
      serviceTypes: center.serviceTypes || [],
      approvalStatus: center.approvalStatus || 'pending',
      createdAt: center.createdAt,
      updatedAt: center.updatedAt
    }));
    
    res.json({ centers: centersData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service centers', error: error.message });
  }
});

// Approve/Reject Service Center
router.put('/service-centers/:centerId/approval', async (req, res) => {
  try {
    const { centerId } = req.params;
    const { approvalStatus } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status. Use "approved" or "rejected"' });
    }
    
    await pool.execute(
      'UPDATE serviceCenters SET approvalStatus = ? WHERE centerId = ?',
      [approvalStatus, centerId]
    );
    
    const center = await ServiceCenter.findOne({ centerId });
    res.json({ 
      message: `Service center ${approvalStatus} successfully`, 
      center: {
        centerId: center.centerId,
        name: center.name,
        approvalStatus: approvalStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating approval status', error: error.message });
  }
});

// Get User Activity
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    
    // Get activity stats for each user
    const usersData = await Promise.all(users.map(async (user) => {
      if (user.role === 'admin') return null; // Skip admin users
      
      let bookingsCount = 0;
      let vehiclesCount = 0;
      let centersCount = 0;
      let feedbackCount = 0;
      
      if (user.role === 'customer') {
        const [bookings] = await pool.execute('SELECT COUNT(*) as count FROM bookings WHERE userId = ?', [user.userId]);
        bookingsCount = bookings[0].count;
        
        const [vehicles] = await pool.execute('SELECT COUNT(*) as count FROM vehicles WHERE userId = ?', [user.userId]);
        vehiclesCount = vehicles[0].count;
        
        const [feedback] = await pool.execute('SELECT COUNT(*) as count FROM feedback WHERE userId = ?', [user.userId]);
        feedbackCount = feedback[0].count;
      } else if (user.role === 'garage') {
        const [centers] = await pool.execute('SELECT COUNT(*) as count FROM serviceCenters WHERE ownerId = ?', [user.userId]);
        centersCount = centers[0].count;
        
        const [bookings] = await pool.execute(`
          SELECT COUNT(*) as count 
          FROM bookings b
          INNER JOIN serviceCenters sc ON b.centerId = sc.centerId
          WHERE sc.ownerId = ?
        `, [user.userId]);
        bookingsCount = bookings[0].count;
      }
      
      return {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        contact: user.contact,
        location: user.location,
        createdAt: user.createdAt,
        stats: {
          bookings: bookingsCount,
          vehicles: vehiclesCount,
          centers: centersCount,
          feedback: feedbackCount
        }
      };
    }));
    
    res.json({ users: usersData.filter(u => u !== null) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get All Feedback
router.get('/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    
    // Populate related data
    for (const feedback of feedbacks) {
      await feedback.populate('bookingId', 'bookingId serviceType date status');
      await feedback.populate('userId', 'name email');
    }
    
    const feedbacksData = feedbacks.map(feedback => ({
      feedbackId: feedback.feedbackId,
      bookingId: typeof feedback.bookingId === 'object' ? feedback.bookingId : { bookingId: feedback.bookingId },
      userId: feedback.userId,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt
    }));
    
    res.json({ feedbacks: feedbacksData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feedback', error: error.message });
  }
});

// Delete Feedback (for flagged issues)
router.delete('/feedback/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    await pool.execute('DELETE FROM feedback WHERE feedbackId = ?', [feedbackId]);
    
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting feedback', error: error.message });
  }
});

module.exports = router;


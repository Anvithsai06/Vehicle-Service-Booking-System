const express = require('express');
const Booking = require('../models/Booking');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Create Booking (Customer only)
router.post('/', auth, authorize('customer'), async (req, res) => {
  try {
    const { vehicleId, centerId, serviceType, date, timeSlot } = req.body;

    const booking = new Booking({
      userId: req.user.userId,
      vehicleId,
      centerId,
      serviceType,
      date: new Date(date),
      timeSlot,
      status: 'Pending'
    });

    await booking.save();
    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
});

// Get Bookings by Center (Garage Owner only)
router.get('/center/:centerId', auth, authorize('garage'), async (req, res) => {
  try {
    let bookings = await Booking.find({ centerId: req.params.centerId });
    await Booking.populateAll(bookings, 'userId name contact', 'vehicleId');
    bookings = Booking.sort(bookings, { date: 1, createdAt: -1 });
    
    // Convert to plain objects
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
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
});

// Get Bookings by User (Customer only)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Only allow users to see their own bookings, or garage owners to see bookings
    if (req.user.role === 'customer' && req.params.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let bookings = await Booking.find({ userId: req.params.userId });
    await Booking.populateAll(bookings, 'vehicleId', 'centerId name address contact');
    bookings = Booking.sort(bookings, { createdAt: -1 });
    
    // Convert to plain objects
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
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
});

// Get My Bookings (Customer)
router.get('/my-bookings', auth, authorize('customer'), async (req, res) => {
  try {
    let bookings = await Booking.find({ userId: req.user.userId });
    await Booking.populateAll(bookings, 'vehicleId', 'centerId name address contact');
    bookings = Booking.sort(bookings, { createdAt: -1 });
    
    // Convert to plain objects
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
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
});

// Update Booking Status (Garage Owner only)
router.put('/:id/status', auth, authorize('garage'), async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!['Pending', 'Confirmed', 'Completed', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findOne({ bookingId: req.params.id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify the booking belongs to a center owned by this garage
    const ServiceCenter = require('../models/ServiceCenter');
    const center = await ServiceCenter.findOne({ centerId: booking.centerId });
    if (!center || center.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    booking.status = status;
    if (remarks) booking.remarks = remarks;
    await booking.save();

    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status', error: error.message });
  }
});

// Get Booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    await booking.populate('userId name contact', 'vehicleId', 'centerId name address contact');
    res.json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching booking', error: error.message });
  }
});

module.exports = router;


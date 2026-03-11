const express = require('express');
const ServiceCenter = require('../models/ServiceCenter');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// List Service Centers (All authenticated users - only approved centers for customers)
router.get('/', auth, async (req, res) => {
  try {
    let centers = await ServiceCenter.find();
    
    // Filter: Only show approved centers to customers, all centers to garage owners and admins
    if (req.user.role === 'customer') {
      centers = centers.filter(center => (center.approvalStatus || 'pending') === 'approved');
    }
    
    await ServiceCenter.populateAll(centers, 'ownerId', 'name contact location');
    // Convert to plain objects
    const centersData = centers.map(center => ({
      centerId: center.centerId,
      ownerId: center.ownerId,
      name: center.name,
      address: center.address,
      contact: center.contact,
      serviceTypes: center.serviceTypes || [],
      priceList: center.priceList || {},
      availableSlots: center.availableSlots || [],
      approvalStatus: center.approvalStatus || 'pending',
      createdAt: center.createdAt,
      updatedAt: center.updatedAt
    }));
    res.json({ centers: centersData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service centers', error: error.message });
  }
});

// Get Service Center by ID
router.get('/:centerId', auth, async (req, res) => {
  try {
    const center = await ServiceCenter.findOne({ centerId: req.params.centerId });
    if (!center) {
      return res.status(404).json({ message: 'Service center not found' });
    }
    await center.populate('ownerId', 'name contact location');
    res.json({ center });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service center', error: error.message });
  }
});

// Add Service Center (Garage Owner only)
router.post('/', auth, authorize('garage'), async (req, res) => {
  try {
    const { name, address, contact, serviceTypes, priceList, availableSlots } = req.body;

    const center = new ServiceCenter({
      ownerId: req.user.userId,
      name,
      address,
      contact,
      serviceTypes: serviceTypes || [],
      priceList: priceList || {},
      availableSlots: availableSlots || []
    });

    await center.save();
    res.status(201).json({ message: 'Service center added successfully', center });
  } catch (error) {
    res.status(500).json({ message: 'Error adding service center', error: error.message });
  }
});

// Get My Service Centers (Garage Owner only)
router.get('/owner/my-centers', auth, authorize('garage'), async (req, res) => {
  try {
    const centers = await ServiceCenter.find({ ownerId: req.user.userId });
    // Convert ServiceCenter instances to plain objects
    const centersData = centers.map(center => ({
      centerId: center.centerId,
      ownerId: center.ownerId,
      name: center.name,
      address: center.address,
      contact: center.contact,
      serviceTypes: center.serviceTypes || [],
      priceList: center.priceList || {},
      availableSlots: center.availableSlots || [],
      createdAt: center.createdAt,
      updatedAt: center.updatedAt
    }));
    res.json({ centers: centersData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service centers', error: error.message });
  }
});

module.exports = router;


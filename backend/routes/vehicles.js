const express = require('express');
const Vehicle = require('../models/Vehicle');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Add Vehicle (Customer only)
router.post('/', auth, authorize('customer'), async (req, res) => {
  try {
    const { registrationNumber, model, type, lastServiceDate } = req.body;

    // Validate required fields
    if (!registrationNumber || !model || !type) {
      return res.status(400).json({ message: 'Registration number, model, and type are required' });
    }

    const vehicle = new Vehicle({
      userId: req.user.userId,
      registrationNumber,
      model,
      type,
      lastServiceDate: lastServiceDate || null
    });

    const savedVehicle = await vehicle.save();
    
    // Convert to plain object
    const vehicleData = {
      vehicleId: savedVehicle.vehicleId,
      userId: savedVehicle.userId,
      registrationNumber: savedVehicle.registrationNumber,
      model: savedVehicle.model,
      type: savedVehicle.type,
      lastServiceDate: savedVehicle.lastServiceDate,
      createdAt: savedVehicle.createdAt,
      updatedAt: savedVehicle.updatedAt
    };
    
    res.status(201).json({ message: 'Vehicle added successfully', vehicle: vehicleData });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.status(500).json({ message: 'Error adding vehicle', error: error.message });
  }
});

// Get My Vehicles (Customer only)
router.get('/', auth, authorize('customer'), async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.user.userId });
    // Convert to plain objects
    const vehiclesData = vehicles.map(vehicle => ({
      vehicleId: vehicle.vehicleId,
      userId: vehicle.userId,
      registrationNumber: vehicle.registrationNumber,
      model: vehicle.model,
      type: vehicle.type,
      lastServiceDate: vehicle.lastServiceDate,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt
    }));
    res.json({ vehicles: vehiclesData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicles', error: error.message });
  }
});

// Get Vehicle by ID
router.get('/:vehicleId', auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ vehicleId: req.params.vehicleId });
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json({ vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle', error: error.message });
  }
});

module.exports = router;


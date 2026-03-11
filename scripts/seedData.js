const { initializeDatabase } = require('../backend/config/database');
const User = require('../backend/models/User');
const ServiceCenter = require('../backend/models/ServiceCenter');

async function seedData() {
  try {
    // Initialize database and create tables
    await initializeDatabase();
    console.log('Database initialized');

    // Check if admin user exists
    let admin = await User.findOne({ email: 'admin@servicebook.com' });
    if (!admin) {
      admin = await User.create({
        userId: 'USR00001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@servicebook.com',
        password: 'admin123',
        contact: '9999999999',
        location: 'Mumbai'
      });
      console.log('Admin user created');
    }

    // Create garage owners
    const garageOwners = [
      {
        userId: 'USR00002',
        name: 'Rajesh Kumar',
        role: 'garage',
        email: 'rajesh@garage.com',
        password: 'garage123',
        contact: '9876543210',
        location: 'Delhi'
      },
      {
        userId: 'USR00003',
        name: 'Suresh Auto Works',
        role: 'garage',
        email: 'suresh@garage.com',
        password: 'garage123',
        contact: '9876543211',
        location: 'Bangalore'
      },
      {
        userId: 'USR00004',
        name: 'Mohan Service Center',
        role: 'garage',
        email: 'mohan@garage.com',
        password: 'garage123',
        contact: '9876543212',
        location: 'Chennai'
      }
    ];

    for (const ownerData of garageOwners) {
      let owner = await User.findOne({ email: ownerData.email });
      if (!owner) {
        owner = await User.create(ownerData);
        console.log(`Garage owner created: ${ownerData.name}`);
      }
    }

    // Create service centers
    const serviceCenters = [
      {
        centerId: 'CTR00001',
        ownerId: 'USR00002',
        name: 'Rajesh Auto Service',
        address: '123 Main Street, Delhi',
        contact: '9876543210',
        serviceTypes: [
          { name: 'Oil Change', price: 600 },
          { name: 'Full Service', price: 1500 },
          { name: 'Washing', price: 300 },
          { name: 'Brake Service', price: 800 },
          { name: 'Tire Replacement', price: 2000 }
        ]
      },
      {
        centerId: 'CTR00002',
        ownerId: 'USR00003',
        name: 'Suresh Auto Works',
        address: '456 MG Road, Bangalore',
        contact: '9876543211',
        serviceTypes: [
          { name: 'Oil Change', price: 600 },
          { name: 'Full Service', price: 1500 },
          { name: 'Washing', price: 300 },
          { name: 'AC Service', price: 1200 },
          { name: 'Engine Repair', price: 3000 }
        ]
      },
      {
        centerId: 'CTR00003',
        ownerId: 'USR00004',
        name: 'Mohan Service Center',
        address: '789 Beach Road, Chennai',
        contact: '9876543212',
        serviceTypes: [
          { name: 'Oil Change', price: 600 },
          { name: 'Full Service', price: 1500 },
          { name: 'Washing', price: 300 },
          { name: 'Battery Replacement', price: 2500 },
          { name: 'Denting & Painting', price: 4000 }
        ]
      }
    ];

    for (const centerData of serviceCenters) {
      let existingCenter = await ServiceCenter.findOne({ centerId: centerData.centerId });
      if (!existingCenter) {
        const owner = await User.findOne({ userId: centerData.ownerId });
        if (owner) {
          const newCenter = await ServiceCenter.create({
            ...centerData,
            ownerId: owner.userId
          });
          console.log(`Service center created: ${centerData.name}`);
        }
      }
    }

    console.log('\n✅ Seed data created successfully!');
    console.log('\nTest Accounts:');
    console.log('Admin - Email: admin@servicebook.com, Password: admin123');
    console.log('Garage 1 - Email: rajesh@garage.com, Password: garage123');
    console.log('Garage 2 - Email: suresh@garage.com, Password: garage123');
    console.log('Garage 3 - Email: mohan@garage.com, Password: garage123');
    console.log('\nYou can create customer accounts through the registration page.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();

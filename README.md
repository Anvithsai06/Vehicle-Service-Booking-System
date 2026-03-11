# Vehicle Service Booking System 🚗

A full-stack web application for booking vehicle servicing appointments at nearby garages or service centers. This project was developed for a hackathon.

## ✨ Features

### For Customers
- User registration and login
- Add and manage vehicles (cars/bikes)
- Browse available service centers
- Book service appointments with step-by-step flow
- View booking status (Pending, Confirmed, Completed)
- Provide feedback after service completion

### For Garage Owners
- Register and manage service centers
- List services with pricing
- View incoming bookings
- Approve/reject bookings
- Update service completion status
- Manage daily appointments

### For Admins
- Monitor all bookings and user activity
- Manage service center registrations

## 🛠 Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)

## 📁 Project Structure

```
vehicle-service-booking-system/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   └── storage/         # File-based storage system
├── frontend/
│   ├── index.html       # Main HTML file
│   ├── styles.css       # Styling
│   └── app.js          # Frontend JavaScript
├── scripts/
│   └── seedData.js     # Database seeding script
├── data/
│   └── database.json   # File-based database (auto-created)
├── server.js           # Express server
├── package.json        # Dependencies
└── README.md          # This file
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (version 5.7 or higher)

### Steps

1. **Install MySQL**
   - Download and install MySQL from [mysql.com](https://dev.mysql.com/downloads/mysql/)
   - Or use XAMPP/WAMP which includes MySQL
   - Make sure MySQL service is running

2. **Configure Database**
   - Create a `.env` file in the project root (copy from `.env.example`)
   - Update MySQL credentials:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_mysql_password
     DB_NAME=vehicle_service_booking
     ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Seed Database (Optional but Recommended)**
   This will create the database, tables, and sample data:
   ```bash
   npm run seed
   ```
   This creates:
   - Database schema (tables)
   - 3 garage owners with service centers
   - 1 admin user

5. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the Application**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## 📝 Default Test Accounts

After running the seed script, you can use these accounts:

- **Admin**: 
  - Email: `admin@servicebook.com`
  - Password: `admin123`

- **Garage Owners**:
  - Email: `rajesh@garage.com`, Password: `garage123`
  - Email: `suresh@garage.com`, Password: `garage123`
  - Email: `mohan@garage.com`, Password: `garage123`

You can create customer accounts through the registration page.

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Vehicles
- `POST /api/vehicles` - Add vehicle (Customer only)
- `GET /api/vehicles` - Get my vehicles (Customer only)

### Service Centers
- `GET /api/centers` - List all service centers
- `POST /api/centers` - Add service center (Garage owner only)
- `GET /api/centers/owner/my-centers` - Get my service centers

### Bookings
- `POST /api/bookings` - Create booking (Customer only)
- `GET /api/bookings/my-bookings` - Get my bookings (Customer)
- `GET /api/bookings/center/:centerId` - Get bookings by center (Garage owner)
- `PUT /api/bookings/:id/status` - Update booking status (Garage owner)

### Feedback
- `POST /api/feedback` - Add feedback (Customer only)

## 📋 Booking Flow

1. Customer selects a vehicle
2. Chooses a service center
3. Selects a service type
4. Picks date and time slot
5. Confirms the booking
6. Garage owner approves/rejects
7. After completion, customer can provide feedback

## 💾 Database Schema

MySQL database with the following tables:

### Users
- userId, name, role, email, password, contact, location, createdAt, updatedAt

### Vehicles
- vehicleId, userId, registrationNumber, model, type, lastServiceDate, createdAt, updatedAt

### ServiceCenters
- centerId, ownerId, name, address, contact, serviceTypes (JSON), priceList (JSON), availableSlots (JSON), createdAt, updatedAt

### Bookings
- bookingId, userId, vehicleId, centerId, serviceType, date, timeSlot, status, remarks, createdAt, updatedAt

### Feedback
- feedbackId, bookingId, userId, rating, comment, createdAt, updatedAt

All tables are automatically created when you run `npm run seed`.

## 📝 Development Notes

- The application uses JWT for authentication
- Passwords are hashed using bcryptjs
- All API endpoints require authentication (except registration)
- CORS is enabled for cross-origin requests
- MySQL connection pool is used for database connections
- Database schema is automatically created on first run

## 🔧 Troubleshooting

### Port Already in Use
If port 3000 is already in use:
- Change the PORT in `.env` file
- Or use: `set PORT=3001 && npm start` (Windows)

### Data Not Persisting
- Check that the `data/` directory exists and is writable
- Verify `data/database.json` is being created

## 🎯 Future Enhancements

- Real-time notifications
- Payment integration
- Calendar view for bookings
- Email/SMS notifications
- Admin dashboard with analytics
- Search and filter functionality

## 📄 License

This project is created for educational/hackathon purposes.

## 👤 Author

Created for hackathon submission.

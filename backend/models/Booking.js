const { pool } = require('../config/database');
const Vehicle = require('./Vehicle');
const ServiceCenter = require('./ServiceCenter');
const User = require('./User');

class Booking {
  constructor(data) {
    this.bookingId = data.bookingId;
    this.userId = data.userId;
    this.vehicleId = data.vehicleId;
    this.centerId = data.centerId;
    this.serviceType = data.serviceType;
    this.date = data.date ? new Date(data.date) : null;
    this.timeSlot = data.timeSlot;
    this.status = data.status || 'Pending';
    this.remarks = data.remarks || '';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findOne(query) {
    try {
      const keys = Object.keys(query);
      const values = Object.values(query);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      
      const [rows] = await pool.execute(
        `SELECT * FROM bookings WHERE ${whereClause} LIMIT 1`,
        values
      );
      
      if (rows.length === 0) return null;
      return new Booking(rows[0]);
    } catch (error) {
      console.error('Error finding booking:', error);
      throw error;
    }
  }

  static async find(query = {}) {
    try {
      let sql = 'SELECT * FROM bookings';
      const values = [];
      
      if (Object.keys(query).length > 0) {
        const keys = Object.keys(query);
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(query));
      }
      
      const [rows] = await pool.execute(sql, values);
      return rows.map(row => new Booking(row));
    } catch (error) {
      console.error('Error finding bookings:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      // Generate bookingId if not provided
      if (!data.bookingId) {
        const [countRows] = await pool.execute('SELECT COUNT(*) as count FROM bookings');
        const count = countRows[0].count;
        data.bookingId = `BKG${String(count + 1).padStart(5, '0')}`;
      }

      const dateValue = data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date;

      await pool.execute(
        `INSERT INTO bookings (bookingId, userId, vehicleId, centerId, serviceType, date, timeSlot, status, remarks) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.bookingId,
          data.userId,
          data.vehicleId,
          data.centerId,
          data.serviceType,
          dateValue,
          data.timeSlot,
          data.status || 'Pending',
          data.remarks || ''
        ]
      );

      return await Booking.findOne({ bookingId: data.bookingId });
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  static sort(bookings, sortObj = {}) {
    return bookings.sort((a, b) => {
      for (const [field, direction] of Object.entries(sortObj)) {
        let aVal = a[field];
        let bVal = b[field];
        
        if (field === 'date' || field === 'createdAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (aVal < bVal) return direction === 1 ? -1 : 1;
        if (aVal > bVal) return direction === 1 ? 1 : -1;
      }
      return 0;
    });
  }

  static async populateAll(bookings, ...fields) {
    for (const booking of bookings) {
      for (const field of fields) {
        const [fieldName, select] = field.split(' ');
        if (fieldName === 'vehicleId') {
          if (typeof booking.vehicleId === 'string') {
            const vehicle = await Vehicle.findOne({ vehicleId: booking.vehicleId });
            booking.vehicleId = vehicle;
          }
        } else if (fieldName === 'centerId') {
          if (typeof booking.centerId === 'string') {
            const center = await ServiceCenter.findOne({ centerId: booking.centerId });
            if (center) {
              if (select) {
                const selected = {};
                select.split(' ').forEach(prop => {
                  if (center[prop] !== undefined) selected[prop] = center[prop];
                });
                booking.centerId = selected;
              } else {
                booking.centerId = center;
              }
            }
          }
        } else if (fieldName === 'userId') {
          if (typeof booking.userId === 'string') {
            const user = await User.findOne({ userId: booking.userId });
            if (user) {
              if (select) {
                const selected = {};
                select.split(' ').forEach(prop => {
                  if (user[prop] !== undefined) selected[prop] = user[prop];
                });
                booking.userId = selected;
              } else {
                booking.userId = user.toJSON();
              }
            }
          }
        }
      }
    }
    return bookings;
  }

  async populate(...fields) {
    for (const field of fields) {
      const [fieldName, select] = field.split(' ');
      if (fieldName === 'vehicleId') {
        const vehicle = await Vehicle.findOne({ vehicleId: this.vehicleId });
        this.vehicleId = vehicle;
      } else if (fieldName === 'centerId') {
        const center = await ServiceCenter.findOne({ centerId: this.centerId });
        if (center) {
          if (select) {
            const selected = {};
            select.split(' ').forEach(prop => {
              if (center[prop] !== undefined) selected[prop] = center[prop];
            });
            this.centerId = selected;
          } else {
            this.centerId = center;
          }
        }
      } else if (fieldName === 'userId') {
        const user = await User.findOne({ userId: this.userId });
        if (user) {
          if (select) {
            const selected = {};
            select.split(' ').forEach(prop => {
              if (user[prop] !== undefined) selected[prop] = user[prop];
            });
            this.userId = selected;
          } else {
            this.userId = user.toJSON();
          }
        }
      }
    }
    return this;
  }

  async save() {
    try {
      if (!this.bookingId) {
        return await Booking.create({
          userId: this.userId,
          vehicleId: this.vehicleId,
          centerId: this.centerId,
          serviceType: this.serviceType,
          date: this.date,
          timeSlot: this.timeSlot,
          status: this.status,
          remarks: this.remarks
        });
      }

      const dateValue = this.date instanceof Date ? this.date.toISOString().split('T')[0] : this.date;

      await pool.execute(
        `UPDATE bookings SET userId = ?, vehicleId = ?, centerId = ?, serviceType = ?, date = ?, timeSlot = ?, status = ?, remarks = ? 
         WHERE bookingId = ?`,
        [
          this.userId,
          this.vehicleId,
          this.centerId,
          this.serviceType,
          dateValue,
          this.timeSlot,
          this.status,
          this.remarks || '',
          this.bookingId
        ]
      );

      return await Booking.findOne({ bookingId: this.bookingId });
    } catch (error) {
      console.error('Error saving booking:', error);
      throw error;
    }
  }
}

module.exports = Booking;

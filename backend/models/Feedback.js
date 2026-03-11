const { pool } = require('../config/database');
const User = require('./User');

class Feedback {
  constructor(data) {
    this.feedbackId = data.feedbackId;
    this.bookingId = data.bookingId;
    this.userId = data.userId;
    this.rating = data.rating;
    this.comment = data.comment || '';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findOne(query) {
    try {
      const keys = Object.keys(query);
      const values = Object.values(query);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      
      const [rows] = await pool.execute(
        `SELECT * FROM feedback WHERE ${whereClause} LIMIT 1`,
        values
      );
      
      if (rows.length === 0) return null;
      return new Feedback(rows[0]);
    } catch (error) {
      console.error('Error finding feedback:', error);
      throw error;
    }
  }

  static async find(query = {}) {
    try {
      let sql = 'SELECT * FROM feedback';
      const values = [];
      
      if (Object.keys(query).length > 0) {
        const keys = Object.keys(query);
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(query));
      }
      
      const [rows] = await pool.execute(sql, values);
      return rows.map(row => new Feedback(row));
    } catch (error) {
      console.error('Error finding feedback:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      // Generate feedbackId if not provided
      if (!data.feedbackId) {
        const [countRows] = await pool.execute('SELECT COUNT(*) as count FROM feedback');
        const count = countRows[0].count;
        data.feedbackId = `FDB${String(count + 1).padStart(5, '0')}`;
      }

      await pool.execute(
        `INSERT INTO feedback (feedbackId, bookingId, userId, rating, comment) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.feedbackId,
          data.bookingId,
          data.userId,
          data.rating,
          data.comment || ''
        ]
      );

      return await Feedback.findOne({ feedbackId: data.feedbackId });
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  async populate(field, select = null) {
    if (field === 'userId') {
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
    } else if (field === 'bookingId') {
      const Booking = require('./Booking');
      const booking = await Booking.findOne({ bookingId: this.bookingId });
      if (booking) {
        if (select) {
          const selected = {};
          select.split(' ').forEach(prop => {
            if (booking[prop] !== undefined) selected[prop] = booking[prop];
          });
          this.bookingId = selected;
        } else {
          this.bookingId = booking.toJSON();
        }
      }
    }
    return this;
  }

  async save() {
    try {
      if (!this.feedbackId) {
        return await Feedback.create({
          bookingId: this.bookingId,
          userId: this.userId,
          rating: this.rating,
          comment: this.comment
        });
      }

      await pool.execute(
        `UPDATE feedback SET bookingId = ?, userId = ?, rating = ?, comment = ? 
         WHERE feedbackId = ?`,
        [
          this.bookingId,
          this.userId,
          this.rating,
          this.comment || '',
          this.feedbackId
        ]
      );

      return await Feedback.findOne({ feedbackId: this.feedbackId });
    } catch (error) {
      console.error('Error saving feedback:', error);
      throw error;
    }
  }
}

module.exports = Feedback;

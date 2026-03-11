const { pool } = require('../config/database');

class Vehicle {
  constructor(data) {
    this.vehicleId = data.vehicleId;
    this.userId = data.userId;
    this.registrationNumber = data.registrationNumber;
    this.model = data.model;
    this.type = data.type;
    this.lastServiceDate = data.lastServiceDate;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findOne(query) {
    try {
      const keys = Object.keys(query);
      const values = Object.values(query);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      
      const [rows] = await pool.execute(
        `SELECT * FROM vehicles WHERE ${whereClause} LIMIT 1`,
        values
      );
      
      if (rows.length === 0) return null;
      return new Vehicle(rows[0]);
    } catch (error) {
      console.error('Error finding vehicle:', error);
      throw error;
    }
  }

  static async find(query = {}) {
    try {
      let sql = 'SELECT * FROM vehicles';
      const values = [];
      
      if (Object.keys(query).length > 0) {
        const keys = Object.keys(query);
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(query));
      }
      
      const [rows] = await pool.execute(sql, values);
      return rows.map(row => new Vehicle(row));
    } catch (error) {
      console.error('Error finding vehicles:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      // Generate vehicleId if not provided
      if (!data.vehicleId) {
        const [countRows] = await pool.execute('SELECT COUNT(*) as count FROM vehicles');
        const count = countRows[0].count;
        data.vehicleId = `VEH${String(count + 1).padStart(5, '0')}`;
      }

      await pool.execute(
        `INSERT INTO vehicles (vehicleId, userId, registrationNumber, model, type, lastServiceDate) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.vehicleId,
          data.userId,
          data.registrationNumber,
          data.model,
          data.type,
          data.lastServiceDate || null
        ]
      );

      return await Vehicle.findOne({ vehicleId: data.vehicleId });
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  async save() {
    try {
      if (!this.vehicleId) {
        return await Vehicle.create({
          userId: this.userId,
          registrationNumber: this.registrationNumber,
          model: this.model,
          type: this.type,
          lastServiceDate: this.lastServiceDate
        });
      }

      await pool.execute(
        `UPDATE vehicles SET userId = ?, registrationNumber = ?, model = ?, type = ?, lastServiceDate = ? 
         WHERE vehicleId = ?`,
        [
          this.userId,
          this.registrationNumber,
          this.model,
          this.type,
          this.lastServiceDate || null,
          this.vehicleId
        ]
      );

      return await Vehicle.findOne({ vehicleId: this.vehicleId });
    } catch (error) {
      console.error('Error saving vehicle:', error);
      throw error;
    }
  }
}

module.exports = Vehicle;

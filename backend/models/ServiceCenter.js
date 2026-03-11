const { pool } = require('../config/database');
const User = require('./User');

class ServiceCenter {
  constructor(data) {
    this.centerId = data.centerId;
    this.ownerId = data.ownerId;
    this.name = data.name;
    this.address = data.address;
    this.contact = data.contact;
    this.serviceTypes = typeof data.serviceTypes === 'string' ? JSON.parse(data.serviceTypes) : (data.serviceTypes || []);
    this.priceList = typeof data.priceList === 'string' ? JSON.parse(data.priceList) : (data.priceList || {});
    this.availableSlots = typeof data.availableSlots === 'string' ? JSON.parse(data.availableSlots) : (data.availableSlots || []);
    this.approvalStatus = data.approvalStatus || 'pending';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findOne(query) {
    try {
      const keys = Object.keys(query);
      const values = Object.values(query);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      
      const [rows] = await pool.execute(
        `SELECT * FROM serviceCenters WHERE ${whereClause} LIMIT 1`,
        values
      );
      
      if (rows.length === 0) return null;
      return new ServiceCenter(rows[0]);
    } catch (error) {
      console.error('Error finding service center:', error);
      throw error;
    }
  }

  static async find(query = {}) {
    try {
      let sql = 'SELECT * FROM serviceCenters';
      const values = [];
      
      if (Object.keys(query).length > 0) {
        const keys = Object.keys(query);
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(query));
      }
      
      const [rows] = await pool.execute(sql, values);
      return rows.map(row => new ServiceCenter(row));
    } catch (error) {
      console.error('Error finding service centers:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      // Generate centerId if not provided
      if (!data.centerId) {
        const [countRows] = await pool.execute('SELECT COUNT(*) as count FROM serviceCenters');
        const count = countRows[0].count;
        data.centerId = `CTR${String(count + 1).padStart(5, '0')}`;
      }

      await pool.execute(
        `INSERT INTO serviceCenters (centerId, ownerId, name, address, contact, serviceTypes, priceList, availableSlots, approvalStatus) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.centerId,
          data.ownerId,
          data.name,
          data.address,
          data.contact,
          JSON.stringify(data.serviceTypes || []),
          JSON.stringify(data.priceList || {}),
          JSON.stringify(data.availableSlots || []),
          data.approvalStatus || 'pending'
        ]
      );

      return await ServiceCenter.findOne({ centerId: data.centerId });
    } catch (error) {
      console.error('Error creating service center:', error);
      throw error;
    }
  }

  static async populateAll(centers, field, select = null) {
    if (field === 'ownerId') {
      for (const center of centers) {
        if (typeof center.ownerId === 'string') {
          const owner = await User.findOne({ userId: center.ownerId });
          if (owner) {
            if (select) {
              const selected = {};
              select.split(' ').forEach(prop => {
                if (owner[prop] !== undefined) selected[prop] = owner[prop];
              });
              center.ownerId = selected;
            } else {
              center.ownerId = owner.toJSON();
            }
          }
        }
      }
    }
    return centers;
  }

  async populate(field, select = null) {
    if (field === 'ownerId') {
      const owner = await User.findOne({ userId: this.ownerId });
      if (owner) {
        if (select) {
          const selected = {};
          select.split(' ').forEach(prop => {
            if (owner[prop] !== undefined) selected[prop] = owner[prop];
          });
          this.ownerId = selected;
        } else {
          this.ownerId = owner.toJSON();
        }
      }
    }
    return this;
  }

  async save() {
    try {
      if (!this.centerId) {
        return await ServiceCenter.create({
          ownerId: this.ownerId,
          name: this.name,
          address: this.address,
          contact: this.contact,
          serviceTypes: this.serviceTypes,
          priceList: this.priceList,
          availableSlots: this.availableSlots
        });
      }

      await pool.execute(
        `UPDATE serviceCenters SET ownerId = ?, name = ?, address = ?, contact = ?, serviceTypes = ?, priceList = ?, availableSlots = ?, approvalStatus = ? 
         WHERE centerId = ?`,
        [
          this.ownerId,
          this.name,
          this.address,
          this.contact,
          JSON.stringify(this.serviceTypes || []),
          JSON.stringify(this.priceList || {}),
          JSON.stringify(this.availableSlots || []),
          this.approvalStatus || 'pending',
          this.centerId
        ]
      );

      return await ServiceCenter.findOne({ centerId: this.centerId });
    } catch (error) {
      console.error('Error saving service center:', error);
      throw error;
    }
  }
}

module.exports = ServiceCenter;

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.userId = data.userId;
    this.name = data.name;
    this.role = data.role;
    this.email = data.email;
    this.password = data.password;
    this.contact = data.contact;
    this.location = data.location;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findOne(query) {
    try {
      const keys = Object.keys(query);
      const values = Object.values(query);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      
      const [rows] = await pool.execute(
        `SELECT * FROM users WHERE ${whereClause} LIMIT 1`,
        values
      );
      
      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }

  static async find(query = {}) {
    try {
      let sql = 'SELECT * FROM users';
      const values = [];
      
      if (Object.keys(query).length > 0) {
        const keys = Object.keys(query);
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(query));
      }
      
      const [rows] = await pool.execute(sql, values);
      return rows.map(row => new User(row));
    } catch (error) {
      console.error('Error finding users:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      // Check if email already exists
      if (data.email) {
        const existing = await User.findOne({ email: data.email });
        if (existing) {
          throw new Error('User already exists with this email');
        }
      }

      // Generate userId if not provided
      if (!data.userId) {
        const [countRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const count = countRows[0].count;
        data.userId = `USR${String(count + 1).padStart(5, '0')}`;
      }

      // Hash password
      if (data.password && !data.password.startsWith('$2')) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      await pool.execute(
        `INSERT INTO users (userId, name, role, email, password, contact, location) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.userId,
          data.name,
          data.role,
          data.email,
          data.password,
          data.contact,
          data.location
        ]
      );

      return await User.findOne({ userId: data.userId });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async save() {
    try {
      if (!this.userId) {
        return await User.create({
          name: this.name,
          role: this.role,
          email: this.email,
          password: this.password,
          contact: this.contact,
          location: this.location
        });
      }

      // Hash password if it's new/modified
      let password = this.password;
      if (password && !password.startsWith('$2')) {
        password = await bcrypt.hash(password, 10);
      }

      await pool.execute(
        `UPDATE users SET name = ?, role = ?, email = ?, password = ?, contact = ?, location = ? 
         WHERE userId = ?`,
        [this.name, this.role, this.email, password, this.contact, this.location, this.userId]
      );

      return await User.findOne({ userId: this.userId });
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const { password, ...user } = this;
    return user;
  }
}

module.exports = User;

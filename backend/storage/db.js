const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database structure
const initializeDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      vehicles: [],
      serviceCenters: [],
      bookings: [],
      feedback: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
};

// Read database
const readDB = () => {
  initializeDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return {
      users: [],
      vehicles: [],
      serviceCenters: [],
      bookings: [],
      feedback: []
    };
  }
};

// Helper to serialize dates in objects
const serializeDates = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeDates);
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = serializeDates(obj[key]);
    }
    return result;
  }
  return obj;
};

// Write database
const writeDB = (data) => {
  try {
    const serialized = serializeDates(data);
    fs.writeFileSync(DB_FILE, JSON.stringify(serialized, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
};

// Database operations
const db = {
  // Generic find operations
  find: (collection, query = {}) => {
    const data = readDB();
    const items = data[collection] || [];
    
    if (Object.keys(query).length === 0) {
      return items;
    }
    
    return items.filter(item => {
      return Object.keys(query).every(key => {
        if (query[key] instanceof Object) {
          // Handle complex queries like { $in, $gte, etc. }
          return true; // Simplified for now
        }
        return item[key] === query[key];
      });
    });
  },
  
  findOne: (collection, query) => {
    const results = db.find(collection, query);
    return results.length > 0 ? results[0] : null;
  },
  
  findById: (collection, idField, id) => {
    return db.findOne(collection, { [idField]: id });
  },
  
  // Insert operations
  insert: (collection, item) => {
    const data = readDB();
    if (!data[collection]) {
      data[collection] = [];
    }
    // Serialize dates before storing
    const serializedItem = serializeDates(item);
    data[collection].push(serializedItem);
    writeDB(data);
    return serializedItem;
  },
  
  // Update operations
  update: (collection, query, update) => {
    const data = readDB();
    if (!data[collection]) {
      return null;
    }
    
    const index = data[collection].findIndex(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
    
    if (index === -1) {
      return null;
    }
    
    const updated = { ...data[collection][index], ...serializeDates(update) };
    data[collection][index] = updated;
    writeDB(data);
    return updated;
  },
  
  // Delete operations
  delete: (collection, query) => {
    const data = readDB();
    if (!data[collection]) {
      return false;
    }
    
    const index = data[collection].findIndex(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
    
    if (index === -1) {
      return false;
    }
    
    data[collection].splice(index, 1);
    writeDB(data);
    return true;
  },
  
  // Count documents
  count: (collection, query = {}) => {
    return db.find(collection, query).length;
  },
  
  // Initialize database
  init: initializeDB
};

// Initialize on load
initializeDB();

module.exports = db;


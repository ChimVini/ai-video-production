const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { schema } = require('./schema.js');

let db;

function initDatabase() {
  const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'ai-video-production.db')
    : path.join(__dirname, '../../data/ai-video-production.db');

  // Ensure directory exists
  const fs = require('fs');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  db.exec(schema);

  console.log(`Database initialized at: ${dbPath}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDatabase, getDb };

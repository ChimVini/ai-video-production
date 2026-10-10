const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { schema, migrations } = require('./schema.js');

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

  // Run schema (CREATE TABLE IF NOT EXISTS — safe for new and existing DBs)
  db.exec(schema);

  // Run migrations for existing databases (ALTER TABLE — may fail if columns already exist)
  // Each statement is run individually so one failure doesn't block the rest
  const migrationStatements = migrations
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of migrationStatements) {
    try {
      db.exec(stmt);
    } catch (err) {
      // Ignore "duplicate column" errors — column already exists from a previous migration
      if (!err.message.includes('duplicate column')) {
        console.warn(`Migration warning: ${err.message}`);
      }
    }
  }

  console.log(`Database initialized at: ${dbPath}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDatabase, getDb };

"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const QRCode = require("qrcode");
const bcryptjs = require("bcryptjs");
const uuid = require("uuid");
const crypto = require("crypto");
const whatsappWeb_js = require("whatsapp-web.js");
const events = require("events");
const https = require("https");
const http = require("http");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const QRCode__namespace = /* @__PURE__ */ _interopNamespaceDefault(QRCode);
let cachedPdfLib = null;
function getPdfLib() {
  if (cachedPdfLib) {
    return cachedPdfLib;
  }
  try {
    cachedPdfLib = require("pdf-lib");
    return cachedPdfLib;
  } catch (error) {
    throw new Error(
      "Card batch PDF generation is unavailable because dependency 'pdf-lib' is missing. Please reinstall or update GymFlow."
    );
  }
}
let db = null;
function getUserDataPath() {
  return electron.app.getPath("userData");
}
function getPhotosPath() {
  return path.join(getUserDataPath(), "photos");
}
function getDatabase() {
  if (!db) {
    if (electron.app.isReady()) {
      return initDatabase();
    }
    throw new Error("Database not initialized. App is not ready.");
  }
  return db;
}
function initDatabase() {
  const userDataPath = getUserDataPath();
  const dbPath = path.join(userDataPath, "gymflow.db");
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const photosPath = getPhotosPath();
  if (!fs.existsSync(photosPath)) {
    fs.mkdirSync(photosPath, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at INTEGER DEFAULT (unixepoch())
    )
  `);
  const appliedMigrations = database.prepare("SELECT name FROM migrations").all().map((row) => row.name);
  if (!appliedMigrations.includes("001_initial_schema")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
        photo_path TEXT,
        access_tier TEXT CHECK(access_tier IN ('A', 'B')) DEFAULT 'A',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
        plan_months INTEGER CHECK(plan_months IN (1, 3, 6, 12)) NOT NULL,
        price_paid REAL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription
        ON subscriptions(member_id) WHERE is_active = 1;

      CREATE TABLE IF NOT EXISTS quotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        cycle_start INTEGER NOT NULL,
        cycle_end INTEGER NOT NULL,
        sessions_used INTEGER DEFAULT 0,
        sessions_cap INTEGER NOT NULL,
        UNIQUE(subscription_id, cycle_start)
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT REFERENCES members(id),
        scanned_value TEXT NOT NULL,
        method TEXT CHECK(method IN ('scan', 'manual')) DEFAULT 'scan',
        timestamp INTEGER DEFAULT (unixepoch()),
        status TEXT CHECK(status IN ('allowed', 'denied', 'warning')) NOT NULL,
        reason_code TEXT
      );

      CREATE TABLE IF NOT EXISTS message_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL REFERENCES members(id),
        message_type TEXT NOT NULL,
        payload_json TEXT,
        scheduled_at INTEGER NOT NULL,
        sent_at INTEGER,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        last_attempt_at INTEGER,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON subscriptions(end_date);
      CREATE INDEX IF NOT EXISTS idx_quotas_member ON quotas(member_id, cycle_end);
      CREATE INDEX IF NOT EXISTS idx_logs_member ON logs(member_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_queue_status ON message_queue(status, scheduled_at);
    `);
    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("001_initial_schema");
  }
  if (!appliedMigrations.includes("002_owner_auth")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        verified_at INTEGER,
        last_login INTEGER
      );

      CREATE TABLE IF NOT EXISTS owner_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER,
        revoked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS owner_otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT CHECK(purpose IN ('verify', 'reset')) NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        used_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);
      CREATE INDEX IF NOT EXISTS idx_owner_sessions_token ON owner_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_owner_otps_phone ON owner_otps(phone, purpose);
    `);
    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("002_owner_auth");
  }
  if (!appliedMigrations.includes("003_member_card_code")) {
    database.exec(`
      ALTER TABLE members ADD COLUMN card_code TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_members_card_code ON members(card_code);
    `);
    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("003_member_card_code");
  }
  if (!appliedMigrations.includes("004_owner_name")) {
    database.exec(`
      ALTER TABLE owners ADD COLUMN name TEXT;
    `);
    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("004_owner_name");
  }
  if (!appliedMigrations.includes("005_member_serials")) {
    const rows = database.prepare(
      `SELECT id FROM members
         WHERE card_code IS NULL OR TRIM(card_code) = ''
         ORDER BY created_at ASC`
    ).all();
    const maxRow = database.prepare(
      `SELECT MAX(CAST(card_code AS INTEGER)) as max
         FROM members
         WHERE card_code GLOB '[0-9][0-9][0-9][0-9][0-9]'`
    ).get();
    let nextNumber = (maxRow?.max ? Number(maxRow.max) : 0) + 1;
    for (const row of rows) {
      const code = `${String(nextNumber).padStart(5, "0")}`;
      database.prepare("UPDATE members SET card_code = ? WHERE id = ?").run(code, row.id);
      nextNumber += 1;
    }
    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("005_member_serials");
  }
  if (!appliedMigrations.includes("006_member_address_sessions")) {
    database.exec(`
      ALTER TABLE members ADD COLUMN address TEXT;
      ALTER TABLE subscriptions ADD COLUMN sessions_per_month INTEGER;
    `);
    const readSettingNumber = (key, fallback) => {
      try {
        const row = database.prepare("SELECT value FROM settings WHERE key = ?").get(key);
        if (!row || row.value === void 0) return fallback;
        try {
          const parsed = JSON.parse(row.value);
          return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
        } catch {
          const num = Number(row.value);
          return Number.isFinite(num) ? num : fallback;
        }
      } catch {
        return fallback;
      }
    };
    const maleDefault = readSettingNumber("session_cap_male", 26);
    const femaleDefault = readSettingNumber("session_cap_female", 30);
    database.prepare(
      `UPDATE subscriptions
         SET sessions_per_month = ?
         WHERE sessions_per_month IS NULL
           AND member_id IN (SELECT id FROM members WHERE gender = 'male')`
    ).run(maleDefault);
    database.prepare(
      `UPDATE subscriptions
         SET sessions_per_month = ?
         WHERE sessions_per_month IS NULL
           AND member_id IN (SELECT id FROM members WHERE gender = 'female')`
    ).run(femaleDefault);
    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("006_member_address_sessions");
  }
  if (!appliedMigrations.includes("007_guest_passes_freezes")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS guest_passes (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        price_paid REAL,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS subscription_freezes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
        days INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_guest_passes_code ON guest_passes(code);
      CREATE INDEX IF NOT EXISTS idx_subscription_freezes_subscription
        ON subscription_freezes(subscription_id);
    `);
    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("007_guest_passes_freezes");
  }
}
const SERIAL_PREFIX$1 = "";
const SERIAL_PAD$1 = 5;
function formatSerial$1(num) {
  return `${SERIAL_PREFIX$1}${String(num).padStart(SERIAL_PAD$1, "0")}`;
}
function getMaxSerialNumber() {
  const db2 = getDatabase();
  const result = db2.prepare(
    `SELECT MAX(CAST(card_code AS INTEGER)) as max
       FROM members
       WHERE card_code GLOB '[0-9][0-9][0-9][0-9][0-9]'`
  ).get();
  return result?.max ? Number(result.max) : 0;
}
function generateNextCardCode() {
  const next = getMaxSerialNumber() + 1;
  return formatSerial$1(next);
}
function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.substring(2);
  } else if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0")) {
      cleaned = "+20" + cleaned.substring(1);
    } else {
      cleaned = "+20" + cleaned;
    }
  }
  return cleaned;
}
function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) {
    return /^\+\d{8,15}$/.test(cleaned);
  }
  if (cleaned.startsWith("00")) {
    return /^00\d{8,17}$/.test(cleaned);
  }
  return /^\d{8,15}$/.test(cleaned);
}
function createMember(input) {
  if (!validatePhone(input.phone)) {
    throw new Error(`Invalid phone number: ${input.phone}`);
  }
  const db2 = getDatabase();
  const id = uuid.v4();
  const now = Math.floor(Date.now() / 1e3);
  const normalizedPhone = normalizePhone(input.phone);
  const cardCode = input.card_code ? input.card_code.trim() : "";
  if (!cardCode) {
    throw new Error("Card code is required");
  }
  const existing = getMemberByCardCode(cardCode);
  if (existing) {
    throw new Error(`Card code already in use: ${cardCode}`);
  }
  db2.prepare(
    `INSERT INTO members (id, name, phone, gender, photo_path, access_tier, card_code, address, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    normalizedPhone,
    input.gender,
    input.photo_path || null,
    input.access_tier || "A",
    cardCode,
    input.address || null,
    now,
    now
  );
  return getMemberById(id);
}
function getMemberById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM members WHERE id = ?").get(id);
  return result || null;
}
function getMemberByPhone(phone) {
  const db2 = getDatabase();
  const normalized = normalizePhone(phone);
  const result = db2.prepare("SELECT * FROM members WHERE phone = ?").get(normalized);
  return result || null;
}
function getMemberByCardCode(cardCode) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM members WHERE card_code = ?").get(cardCode);
  return result || null;
}
function getAllMembers() {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM members ORDER BY created_at DESC").all();
}
function searchMembers(query) {
  const db2 = getDatabase();
  const normalized = normalizePhone(query);
  const escapeLike = (value) => value.replace(/[\\%_]/g, "\\$&");
  const likeQuery = `%${escapeLike(query)}%`;
  return db2.prepare(
    `SELECT * FROM members
       WHERE name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR phone = ?
       ORDER BY name ASC`
  ).all(likeQuery, likeQuery, normalized);
}
function updateMember(id, input) {
  const db2 = getDatabase();
  const fields = [];
  const values = [];
  if (input.name !== void 0) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.phone !== void 0) {
    if (!validatePhone(input.phone)) {
      throw new Error(`Invalid phone number: ${input.phone}`);
    }
    fields.push("phone = ?");
    values.push(normalizePhone(input.phone));
  }
  if (input.gender !== void 0) {
    fields.push("gender = ?");
    values.push(input.gender);
  }
  if (input.access_tier !== void 0) {
    fields.push("access_tier = ?");
    values.push(input.access_tier);
  }
  if (input.photo_path !== void 0) {
    fields.push("photo_path = ?");
    values.push(input.photo_path);
  }
  if (input.card_code !== void 0) {
    const nextCardCode = input.card_code ? input.card_code.trim() : null;
    if (nextCardCode) {
      const existing = getMemberByCardCode(nextCardCode);
      if (existing && existing.id !== id) {
        throw new Error(`Card code already in use: ${nextCardCode}`);
      }
    }
    fields.push("card_code = ?");
    values.push(nextCardCode);
  }
  if (input.address !== void 0) {
    fields.push("address = ?");
    values.push(input.address || null);
  }
  fields.push("updated_at = ?");
  values.push(Math.floor(Date.now() / 1e3));
  values.push(id);
  db2.prepare(`UPDATE members SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getMemberById(id);
}
function deleteMember(id) {
  const db2 = getDatabase();
  db2.prepare("DELETE FROM members WHERE id = ?").run(id);
}
const DEFAULT_SETTINGS = {
  language: "en",
  session_cap_male: 26,
  session_cap_female: 30,
  warning_days_before_expiry: 3,
  warning_sessions_remaining: 3,
  scan_cooldown_seconds: 30,
  next_card_serial: 1,
  whatsapp_enabled: false,
  whatsapp_batch_delay_min: 10,
  whatsapp_batch_delay_max: 15,
  whatsapp_template_welcome: "Welcome to GymFlow, {{name}}! Your QR code is attached.",
  whatsapp_template_renewal: "Hi {{name}}, your subscription expires in {{days}} days. Please renew soon!",
  whatsapp_template_low_sessions: "Hi {{name}}, you have only {{sessions}} sessions remaining this cycle."
};
function validateSettingValue(key, value, fallback) {
  switch (key) {
    case "language":
    case "whatsapp_template_welcome":
    case "whatsapp_template_renewal":
    case "whatsapp_template_low_sessions":
      return typeof value === "string" ? value : fallback;
    case "session_cap_male":
    case "session_cap_female":
    case "warning_days_before_expiry":
    case "warning_sessions_remaining":
    case "scan_cooldown_seconds":
    case "next_card_serial":
    case "whatsapp_batch_delay_min":
    case "whatsapp_batch_delay_max":
      return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    case "whatsapp_enabled":
      return typeof value === "boolean" ? value : fallback;
    default:
      return value;
  }
}
function getSetting(key, defaultValue) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!result) {
    const fallback = defaultValue !== void 0 ? defaultValue : DEFAULT_SETTINGS[key];
    return fallback;
  }
  try {
    const parsed = JSON.parse(result.value);
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      const fallback = defaultValue !== void 0 ? defaultValue : DEFAULT_SETTINGS[key];
      return validateSettingValue(key, parsed, fallback);
    }
    return parsed;
  } catch {
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      const fallback = defaultValue !== void 0 ? defaultValue : DEFAULT_SETTINGS[key];
      return validateSettingValue(key, result.value, fallback);
    }
    return result.value;
  }
}
function setSetting(key, value) {
  const db2 = getDatabase();
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  db2.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, serialized);
}
function setSettings(settings) {
  const db2 = getDatabase();
  const stmt = db2.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  const transaction = db2.transaction((entries) => {
    for (const [key, value] of entries) {
      if (value === void 0) continue;
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      if (serialized === void 0) {
        throw new Error(`Unable to serialize setting "${key}"`);
      }
      stmt.run(key, serialized);
    }
  });
  transaction(Object.entries(settings));
}
function getAllSettings() {
  const db2 = getDatabase();
  const rows = db2.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  const validated = { ...DEFAULT_SETTINGS };
  for (const [key, value] of Object.entries(settings)) {
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      validated[key] = validateSettingValue(
        key,
        value,
        DEFAULT_SETTINGS[key]
      );
    } else {
      validated[key] = value;
    }
  }
  return validated;
}
function resetToDefaults() {
  const db2 = getDatabase();
  const stmt = db2.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    stmt.run(key, JSON.stringify(value));
  }
}
const SECONDS_PER_DAY$2 = 86400;
const DAYS_PER_MONTH = 30;
function getSubscriptionsByMemberId(memberId) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM subscriptions WHERE member_id = ? ORDER BY created_at DESC").all(memberId);
}
function getActiveSubscription(memberId) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM subscriptions WHERE member_id = ? AND is_active = 1").get(memberId);
  return result || null;
}
function getSubscriptionById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id);
  return result || null;
}
function createSubscription(input) {
  const db2 = getDatabase();
  const transaction = db2.transaction(() => {
    const now = Math.floor(Date.now() / 1e3);
    const startDate = input.start_date || now;
    if (input.sessions_per_month !== void 0 && (!Number.isFinite(input.sessions_per_month) || input.sessions_per_month < 1)) {
      throw new Error("Sessions per month must be a positive number");
    }
    const durationDays = input.plan_months * DAYS_PER_MONTH;
    const endDate = startDate + durationDays * SECONDS_PER_DAY$2;
    db2.prepare("UPDATE subscriptions SET is_active = 0 WHERE member_id = ? AND is_active = 1").run(
      input.member_id
    );
    const result = db2.prepare(
      `INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, price_paid, sessions_per_month, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      input.member_id,
      startDate,
      endDate,
      input.plan_months,
      input.price_paid || null,
      input.sessions_per_month || null,
      now
    );
    return result.lastInsertRowid;
  });
  const subscriptionId = transaction();
  return getSubscriptionById(subscriptionId);
}
function renewSubscription(memberId, planMonths, pricePaid, sessionsPerMonth) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  if (sessionsPerMonth !== void 0 && (!Number.isFinite(sessionsPerMonth) || sessionsPerMonth < 1)) {
    throw new Error("Sessions per month must be a positive number");
  }
  const transaction = db2.transaction(() => {
    const oldSubscription = getActiveSubscription(memberId);
    if (oldSubscription) {
      db2.prepare(
        `UPDATE quotas 
         SET cycle_end = ?
         WHERE subscription_id = ? 
           AND cycle_start <= ? 
           AND cycle_end > ?`
      ).run(now, oldSubscription.id, now, now);
      db2.prepare("UPDATE subscriptions SET is_active = 0 WHERE id = ?").run(oldSubscription.id);
    }
    const startDate = now;
    const durationDays = planMonths * DAYS_PER_MONTH;
    const endDate = startDate + durationDays * SECONDS_PER_DAY$2;
    const result = db2.prepare(
      `INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, price_paid, sessions_per_month, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(memberId, startDate, endDate, planMonths, pricePaid || null, sessionsPerMonth || null, now);
    const newSubscriptionId2 = result.lastInsertRowid;
    const cycleStart = startDate;
    const cycleEnd = Math.min(cycleStart + DAYS_PER_MONTH * SECONDS_PER_DAY$2, endDate);
    const member = getMemberById(memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }
    const sessionCap = sessionsPerMonth && sessionsPerMonth > 0 ? sessionsPerMonth : member.gender === "male" ? getSetting("session_cap_male", 26) : getSetting("session_cap_female", 30);
    db2.prepare(
      `INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap)
       VALUES (?, ?, ?, ?, 0, ?)`
    ).run(memberId, newSubscriptionId2, cycleStart, cycleEnd, sessionCap);
    return newSubscriptionId2;
  });
  const newSubscriptionId = transaction();
  return getSubscriptionById(newSubscriptionId);
}
function cancelSubscription(id) {
  const db2 = getDatabase();
  db2.prepare("UPDATE subscriptions SET is_active = 0 WHERE id = ?").run(id);
}
function updateSubscriptionPricePaid(id, pricePaid) {
  const db2 = getDatabase();
  db2.prepare("UPDATE subscriptions SET price_paid = ? WHERE id = ?").run(pricePaid, id);
  return getSubscriptionById(id);
}
function getExpiringSubscriptions(daysThreshold) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const thresholdDate = now + daysThreshold * SECONDS_PER_DAY$2;
  return db2.prepare(
    `SELECT s.*, m.name, m.phone
       FROM subscriptions s
       JOIN members m ON s.member_id = m.id
       WHERE s.is_active = 1
         AND s.start_date <= ?
         AND s.end_date <= ?
         AND s.end_date > ?
       ORDER BY s.end_date ASC`
  ).all(now, thresholdDate, now);
}
function getActiveSubscriptionCount() {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const result = db2.prepare(
    "SELECT COUNT(*) as count FROM subscriptions WHERE is_active = 1 AND start_date <= ? AND end_date >= ?"
  ).get(now, now);
  return result.count;
}
function getExpiredSubscriptionCount() {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const result = db2.prepare(
    "SELECT COUNT(*) as count FROM subscriptions WHERE is_active = 1 AND end_date < ?"
  ).get(now);
  return result.count;
}
const SECONDS_PER_DAY$1 = 86400;
const CYCLE_LENGTH_DAYS = 30;
function getQuotaById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM quotas WHERE id = ?").get(id);
  return result || null;
}
function getCurrentQuota(memberId) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const result = db2.prepare(
    `SELECT * FROM quotas
       WHERE member_id = ? AND cycle_start <= ? AND cycle_end > ?
       ORDER BY cycle_start DESC
       LIMIT 1`
  ).get(memberId, now, now);
  return result || null;
}
function getQuotaHistory(memberId) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM quotas WHERE member_id = ? ORDER BY cycle_start DESC").all(memberId);
}
function getOrCreateCurrentQuota(memberId) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const subscription = getActiveSubscription(memberId);
  if (!subscription) {
    return null;
  }
  if (subscription.start_date > now) {
    return null;
  }
  if (subscription.end_date <= now) {
    return null;
  }
  const cycleIndex = Math.floor((now - subscription.start_date) / (CYCLE_LENGTH_DAYS * SECONDS_PER_DAY$1));
  const cycleStart = subscription.start_date + cycleIndex * CYCLE_LENGTH_DAYS * SECONDS_PER_DAY$1;
  const cycleEnd = cycleStart + CYCLE_LENGTH_DAYS * SECONDS_PER_DAY$1;
  const effectiveCycleEnd = Math.min(cycleEnd, subscription.end_date);
  let quota = db2.prepare(
    `SELECT * FROM quotas
       WHERE subscription_id = ? AND cycle_start = ?`
  ).get(subscription.id, cycleStart);
  if (!quota) {
    const member = getMemberById(memberId);
    if (!member) return null;
    const sessionCap = subscription.sessions_per_month && subscription.sessions_per_month > 0 ? subscription.sessions_per_month : member.gender === "male" ? getSetting("session_cap_male", 26) : getSetting("session_cap_female", 30);
    const result = db2.prepare(
      `INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap)
         VALUES (?, ?, ?, ?, 0, ?)`
    ).run(memberId, subscription.id, cycleStart, effectiveCycleEnd, sessionCap);
    quota = getQuotaById(result.lastInsertRowid);
  }
  return quota;
}
function incrementSessionsUsed(quotaId) {
  const db2 = getDatabase();
  db2.prepare("UPDATE quotas SET sessions_used = sessions_used + 1 WHERE id = ?").run(quotaId);
}
function getMembersWithLowSessions(threshold) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  return db2.prepare(
    `SELECT
        q.member_id,
        m.name,
        m.phone,
        (q.sessions_cap - q.sessions_used) as sessions_remaining
       FROM quotas q
       JOIN members m ON q.member_id = m.id
       JOIN subscriptions s ON q.subscription_id = s.id
       WHERE s.is_active = 1
         AND q.cycle_start <= ? AND q.cycle_end > ?
         AND (q.sessions_cap - q.sessions_used) <= ?
         AND (q.sessions_cap - q.sessions_used) > 0
       ORDER BY sessions_remaining ASC`
  ).all(now, now, threshold);
}
function createLog(input) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const result = db2.prepare(
    `INSERT INTO logs (member_id, scanned_value, method, timestamp, status, reason_code)
       VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    input.member_id,
    input.scanned_value,
    input.method,
    now,
    input.status,
    input.reason_code || null
  );
  return getLogById(result.lastInsertRowid);
}
function getLogById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM logs WHERE id = ?").get(id);
  return result || null;
}
function getTodayLogs() {
  const db2 = getDatabase();
  const startOfDay = getStartOfDay();
  return db2.prepare("SELECT * FROM logs WHERE timestamp >= ? ORDER BY timestamp DESC").all(startOfDay);
}
function getLogsByMember(memberId, limit = 100) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM logs WHERE member_id = ? ORDER BY timestamp DESC LIMIT ?").all(memberId, limit);
}
function getLastSuccessfulScan(scannedValue, withinSeconds) {
  const db2 = getDatabase();
  const cutoff = Math.floor(Date.now() / 1e3) - withinSeconds;
  const result = db2.prepare(
    `SELECT * FROM logs
       WHERE scanned_value = ?
         AND timestamp >= ?
         AND status IN ('allowed', 'warning')
       ORDER BY timestamp DESC
       LIMIT 1`
  ).get(scannedValue, cutoff);
  return result || null;
}
function hasSuccessfulCheckInToday(memberId) {
  const db2 = getDatabase();
  const startOfDay = getStartOfDay();
  const result = db2.prepare(
    `SELECT 1
       FROM logs
       WHERE member_id = ?
         AND timestamp >= ?
         AND status IN ('allowed', 'warning')
       LIMIT 1`
  ).get(memberId, startOfDay);
  return !!result;
}
function getTodayStats() {
  const db2 = getDatabase();
  const startOfDay = getStartOfDay();
  const result = db2.prepare(
    `SELECT
        SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
       FROM logs
       WHERE timestamp >= ?`
  ).get(startOfDay);
  return {
    allowed: result.allowed || 0,
    warning: result.warning || 0,
    denied: result.denied || 0
  };
}
function getStartOfDay() {
  const now = /* @__PURE__ */ new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1e3);
}
function getDailyAttendanceStats(days) {
  const db2 = getDatabase();
  const startTimestamp = Math.floor(Date.now() / 1e3) - days * 86400;
  return db2.prepare(
    `SELECT
        date(timestamp, 'unixepoch', 'localtime') as date,
        SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
       FROM logs
       WHERE timestamp >= ?
       GROUP BY date
       ORDER BY date ASC`
  ).all(startTimestamp);
}
function getHourlyDistribution() {
  const db2 = getDatabase();
  const startOfDay = getStartOfDay();
  return db2.prepare(
    `SELECT
        CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as count
       FROM logs
       WHERE timestamp >= ? AND status IN ('allowed', 'warning')
       GROUP BY hour
       ORDER BY hour ASC`
  ).all(startOfDay);
}
function getTopMembers(days, limit) {
  const db2 = getDatabase();
  const startTimestamp = Math.floor(Date.now() / 1e3) - days * 86400;
  return db2.prepare(
    `SELECT
        l.member_id,
        m.name,
        COUNT(*) as visits
       FROM logs l
       JOIN members m ON l.member_id = m.id
       WHERE l.timestamp >= ?
         AND l.status IN ('allowed', 'warning')
         AND l.member_id IS NOT NULL
       GROUP BY l.member_id
       ORDER BY visits DESC
       LIMIT ?`
  ).all(startTimestamp, limit);
}
function getDenialReasons(days) {
  const db2 = getDatabase();
  const startTimestamp = Math.floor(Date.now() / 1e3) - days * 86400;
  return db2.prepare(
    `SELECT
        reason_code,
        COUNT(*) as count
       FROM logs
       WHERE timestamp >= ?
         AND status = 'denied'
         AND reason_code IS NOT NULL
       GROUP BY reason_code
       ORDER BY count DESC`
  ).all(startTimestamp);
}
function getPendingMessages(limit = 10) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  return db2.prepare(
    `SELECT * FROM message_queue
       WHERE status = 'pending'
         AND scheduled_at <= ?
         AND attempts < max_attempts
       ORDER BY scheduled_at ASC
       LIMIT ?`
  ).all(now, limit);
}
function getQueueStats() {
  const db2 = getDatabase();
  const result = db2.prepare(
    `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM message_queue`
  ).get();
  return {
    pending: result.pending || 0,
    sent: result.sent || 0,
    failed: result.failed || 0
  };
}
function requeueFailedMessages() {
  const db2 = getDatabase();
  const result = db2.prepare(
    `UPDATE message_queue
       SET status = 'pending', attempts = 0, last_error = NULL
       WHERE status = 'failed'`
  ).run();
  return result.changes;
}
const OTP_TTL_SECONDS = 10 * 60;
const OTP_REQUEST_WINDOW_SECONDS = 60;
const OTP_REQUEST_LIMIT = 3;
const OTP_MAX_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW_SECONDS = 15 * 60;
const OTP_ATTEMPT_LIMIT = 3;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
function getOwnerCount() {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT COUNT(*) as count FROM owners").get();
  return result.count;
}
function getOwnerByPhone(phone) {
  const db2 = getDatabase();
  const normalized = normalizePhone(phone);
  const result = db2.prepare("SELECT * FROM owners WHERE phone = ?").get(normalized);
  return result || null;
}
function getOwnerById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM owners WHERE id = ?").get(id);
  return result || null;
}
function createOwner(phone, passwordHash, name) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const normalized = normalizePhone(phone);
  const normalizedName = name?.trim() || null;
  const result = db2.prepare(
    `INSERT INTO owners (phone, name, password_hash, created_at)
       VALUES (?, ?, ?, ?)`
  ).run(normalized, normalizedName, passwordHash, now);
  return getOwnerById(result.lastInsertRowid);
}
function markOwnerVerified(ownerId) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  db2.prepare("UPDATE owners SET verified_at = ? WHERE id = ?").run(now, ownerId);
}
function updateOwnerPassword(ownerId, passwordHash) {
  const db2 = getDatabase();
  db2.prepare("UPDATE owners SET password_hash = ? WHERE id = ?").run(passwordHash, ownerId);
}
function updateLastLogin(ownerId) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  db2.prepare("UPDATE owners SET last_login = ? WHERE id = ?").run(now, ownerId);
}
function createSession(ownerId) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = now + SESSION_TTL_SECONDS;
  const result = db2.prepare(
    `INSERT INTO owner_sessions (owner_id, token, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
  ).run(ownerId, token, now, expiresAt);
  return getSessionById(result.lastInsertRowid);
}
function getSessionByToken(token) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM owner_sessions WHERE token = ?").get(token);
  return result || null;
}
function getSessionById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM owner_sessions WHERE id = ?").get(id);
  return result || null;
}
function revokeSession(token) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  db2.prepare("UPDATE owner_sessions SET revoked_at = ? WHERE token = ?").run(now, token);
}
function deleteOwnerById(ownerId) {
  const db2 = getDatabase();
  db2.prepare("DELETE FROM owners WHERE id = ?").run(ownerId);
}
function deleteOtpById(otpId) {
  const db2 = getDatabase();
  db2.prepare("DELETE FROM owner_otps WHERE id = ?").run(otpId);
}
function createOtp(phone, purpose) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const normalized = normalizePhone(phone);
  const recentCount = db2.prepare(
    `SELECT COUNT(*) as count
       FROM owner_otps
       WHERE phone = ? AND purpose = ? AND created_at > ?`
  ).get(normalized, purpose, now - OTP_REQUEST_WINDOW_SECONDS);
  if (recentCount.count >= OTP_REQUEST_LIMIT) {
    throw new Error("Too many OTP requests. Please wait before trying again.");
  }
  const code = String(crypto.randomInt(1e5, 1e6));
  const expiresAt = now + OTP_TTL_SECONDS;
  const result = db2.prepare(
    `INSERT INTO owner_otps (phone, code, purpose, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
  ).run(normalized, code, purpose, expiresAt, now);
  return getOtpById(result.lastInsertRowid);
}
function getOtpById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM owner_otps WHERE id = ?").get(id);
  return result || null;
}
function verifyOtp(phone, code, purpose) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const normalized = normalizePhone(phone);
  const attemptCount = db2.prepare(
    `SELECT COALESCE(SUM(attempts), 0) as count
       FROM owner_otps
       WHERE phone = ? AND created_at > ?`
  ).get(normalized, now - OTP_ATTEMPT_WINDOW_SECONDS);
  if (attemptCount.count >= OTP_ATTEMPT_LIMIT) {
    return false;
  }
  const otp = db2.prepare(
    `SELECT * FROM owner_otps
       WHERE phone = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT 1`
  ).get(normalized, purpose, now);
  if (!otp) return false;
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    db2.prepare("UPDATE owner_otps SET used_at = ? WHERE id = ?").run(now, otp.id);
    return false;
  }
  if (otp.code !== code) {
    const newAttempts = otp.attempts + 1;
    db2.prepare("UPDATE owner_otps SET attempts = ? WHERE id = ?").run(newAttempts, otp.id);
    if (newAttempts >= OTP_MAX_ATTEMPTS) {
      db2.prepare("UPDATE owner_otps SET used_at = ? WHERE id = ?").run(now, otp.id);
    }
    return false;
  }
  db2.prepare("UPDATE owner_otps SET used_at = ? WHERE id = ?").run(now, otp.id);
  return true;
}
const CODE_PREFIX = "GP-";
const CODE_PAD = 6;
function formatCode(num) {
  return `${CODE_PREFIX}${String(num).padStart(CODE_PAD, "0")}`;
}
function getMaxGuestPassNumber() {
  const db2 = getDatabase();
  const result = db2.prepare(
    `SELECT MAX(CAST(SUBSTR(code, ${CODE_PREFIX.length + 1}) AS INTEGER)) as max
       FROM guest_passes
       WHERE code LIKE ?`
  ).get(`${CODE_PREFIX}%`);
  return result?.max ? Number(result.max) : 0;
}
function generateNextGuestPassCode() {
  return formatCode(getMaxGuestPassNumber() + 1);
}
function createGuestPass(input) {
  if (!input.name || !input.name.trim()) {
    throw new Error("Guest name is required");
  }
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const validityDays = Math.min(Math.max(input.validity_days || 1, 1), 7);
  const expiresAt = now + validityDays * 86400;
  let code = input.code ? input.code.trim().toUpperCase() : generateNextGuestPassCode();
  if (!code) {
    code = generateNextGuestPassCode();
  }
  let existing = getGuestPassByCode(code);
  while (existing) {
    const match = /^GP-(\d+)$/.exec(code);
    const nextNumber = match ? Number(match[1]) + 1 : getMaxGuestPassNumber() + 1;
    code = formatCode(nextNumber);
    existing = getGuestPassByCode(code);
  }
  const id = uuid.v4();
  db2.prepare(
    `INSERT INTO guest_passes (id, code, name, phone, price_paid, created_at, expires_at, used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    code,
    input.name.trim(),
    input.phone?.trim() || null,
    input.price_paid ?? null,
    now,
    expiresAt,
    null
  );
  return getGuestPassById(id);
}
function getGuestPassById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM guest_passes WHERE id = ?").get(id);
  return result || null;
}
function getGuestPassByCode(code) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM guest_passes WHERE code = ?").get(code.trim());
  return result || null;
}
function listGuestPasses(limit = 50) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM guest_passes ORDER BY created_at DESC LIMIT ?").all(limit);
}
function markGuestPassUsed(code) {
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  db2.prepare(
    `UPDATE guest_passes
     SET used_at = ?
     WHERE code = ? AND used_at IS NULL`
  ).run(now, code.trim());
  return getGuestPassByCode(code);
}
const SECONDS_PER_DAY = 86400;
function getFreezeById(id) {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT * FROM subscription_freezes WHERE id = ?").get(id);
  return result || null;
}
function getActiveFreeze(subscriptionId, atTime) {
  const db2 = getDatabase();
  const now = atTime ?? Math.floor(Date.now() / 1e3);
  const result = db2.prepare(
    `SELECT * FROM subscription_freezes
       WHERE subscription_id = ? AND start_date <= ? AND end_date > ?
       ORDER BY start_date DESC
       LIMIT 1`
  ).get(subscriptionId, now, now);
  return result || null;
}
function getFreezesBySubscriptionId(subscriptionId) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM subscription_freezes WHERE subscription_id = ? ORDER BY start_date DESC").all(subscriptionId);
}
function createSubscriptionFreeze(subscriptionId, days) {
  if (!Number.isFinite(days) || days < 1 || days > 7) {
    throw new Error("Freeze days must be between 1 and 7");
  }
  const db2 = getDatabase();
  const now = Math.floor(Date.now() / 1e3);
  const subscription = getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  const active = getActiveFreeze(subscriptionId, now);
  if (active) {
    throw new Error("Subscription already frozen");
  }
  const startDate = now;
  const endDate = now + days * SECONDS_PER_DAY;
  const transaction = db2.transaction(() => {
    const result = db2.prepare(
      `INSERT INTO subscription_freezes (subscription_id, start_date, end_date, days, created_at)
         VALUES (?, ?, ?, ?, ?)`
    ).run(subscriptionId, startDate, endDate, days, now);
    db2.prepare("UPDATE subscriptions SET end_date = end_date + ? WHERE id = ?").run(
      days * SECONDS_PER_DAY,
      subscriptionId
    );
    return result.lastInsertRowid;
  });
  const freezeId = transaction();
  return getFreezeById(freezeId);
}
function getIncomeSummary() {
  const db2 = getDatabase();
  const subRow = db2.prepare("SELECT COALESCE(SUM(price_paid), 0) as total FROM subscriptions WHERE price_paid IS NOT NULL").get();
  const guestRow = db2.prepare("SELECT COALESCE(SUM(price_paid), 0) as total FROM guest_passes WHERE price_paid IS NOT NULL").get();
  const expectedRow = db2.prepare(
    `SELECT COALESCE(SUM(price_paid / plan_months), 0) as expected
       FROM subscriptions
       WHERE is_active = 1
         AND price_paid IS NOT NULL
         AND plan_months > 0`
  ).get();
  return {
    totalRevenue: Number(subRow.total || 0) + Number(guestRow.total || 0),
    expectedMonthly: Number(expectedRow.expected || 0)
  };
}
function getRecentIncome(limit = 20) {
  const db2 = getDatabase();
  const subscriptions = db2.prepare(
    `SELECT
        s.id,
        s.price_paid,
        s.plan_months,
        s.sessions_per_month,
        s.created_at,
        m.name,
        m.phone
       FROM subscriptions s
       JOIN members m ON s.member_id = m.id
       WHERE s.price_paid IS NOT NULL`
  ).all();
  const guests = db2.prepare(
    `SELECT id, code, name, phone, price_paid, created_at
       FROM guest_passes
       WHERE price_paid IS NOT NULL`
  ).all();
  const combined = [
    ...subscriptions.map((row) => ({
      type: "subscription",
      name: row.name,
      phone: row.phone,
      amount: Number(row.price_paid || 0),
      created_at: row.created_at,
      plan_months: row.plan_months,
      sessions_per_month: row.sessions_per_month ?? null
    })),
    ...guests.map((row) => ({
      type: "guest_pass",
      name: row.name,
      phone: row.phone,
      amount: Number(row.price_paid || 0),
      created_at: row.created_at,
      code: row.code
    }))
  ];
  return combined.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
}
function checkAttendance(scannedValue, method = "scan") {
  const now = Math.floor(Date.now() / 1e3);
  const normalized = scannedValue.trim();
  const scanKey = normalized || scannedValue;
  if (normalized) {
    const guestPass = getGuestPassByCode(normalized);
    if (guestPass) {
      if (guestPass.used_at) {
        createLog({
          member_id: null,
          scanned_value: normalized,
          method,
          status: "denied",
          reason_code: "guest_used"
        });
        return {
          status: "denied",
          reasonCode: "guest_used",
          guestPass
        };
      }
      if (guestPass.expires_at <= now) {
        createLog({
          member_id: null,
          scanned_value: normalized,
          method,
          status: "denied",
          reason_code: "guest_expired"
        });
        return {
          status: "denied",
          reasonCode: "guest_expired",
          guestPass
        };
      }
      const updated = markGuestPassUsed(normalized) || guestPass;
      createLog({
        member_id: null,
        scanned_value: normalized,
        method,
        status: "allowed",
        reason_code: "guest_pass"
      });
      return {
        status: "allowed",
        reasonCode: "guest_pass",
        guestPass: updated
      };
    }
  }
  const cooldownSeconds = getSetting("scan_cooldown_seconds", 30);
  const lastScan = getLastSuccessfulScan(scanKey, cooldownSeconds);
  if (lastScan) {
    return {
      status: "ignored",
      reasonCode: "cooldown"
    };
  }
  const member = method === "manual" ? getMemberById(scanKey) : getMemberByCardCode(scanKey);
  let resolvedMember = member;
  if (!resolvedMember && method !== "manual") {
    resolvedMember = getMemberById(scanKey) || null;
  }
  if (!resolvedMember) {
    createLog({
      member_id: null,
      scanned_value: scanKey,
      method,
      status: "denied",
      reason_code: "unknown_qr"
    });
    return {
      status: "denied",
      reasonCode: "unknown_qr"
    };
  }
  const memberFinal = resolvedMember;
  if (hasSuccessfulCheckInToday(memberFinal.id)) {
    return {
      status: "ignored",
      reasonCode: "already_today",
      member: memberFinal
    };
  }
  const subscription = getActiveSubscription(memberFinal.id);
  if (!subscription) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
      method,
      status: "denied",
      reason_code: "expired"
    });
    return {
      status: "denied",
      reasonCode: "expired",
      member: memberFinal
    };
  }
  if (subscription.end_date <= now) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
      method,
      status: "denied",
      reason_code: "expired"
    });
    return {
      status: "denied",
      reasonCode: "expired",
      member: memberFinal,
      subscription
    };
  }
  if (subscription.start_date > now) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
      method,
      status: "denied",
      reason_code: "not_started"
    });
    return {
      status: "denied",
      reasonCode: "not_started",
      member: memberFinal,
      subscription
    };
  }
  const activeFreeze = getActiveFreeze(subscription.id, now);
  if (activeFreeze) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
      method,
      status: "denied",
      reason_code: "frozen"
    });
    return {
      status: "denied",
      reasonCode: "frozen",
      member: memberFinal,
      subscription,
      freeze: activeFreeze
    };
  }
  const quota = getOrCreateCurrentQuota(memberFinal.id);
  if (!quota) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
      method,
      status: "denied",
      reason_code: "no_quota"
    });
    return {
      status: "denied",
      reasonCode: "no_quota",
      member: memberFinal,
      subscription
    };
  }
  if (quota.sessions_used >= quota.sessions_cap) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
      method,
      status: "denied",
      reason_code: "no_sessions"
    });
    return {
      status: "denied",
      reasonCode: "no_sessions",
      member: memberFinal,
      subscription,
      quota
    };
  }
  const warnings = [];
  const warningDays = getSetting("warning_days_before_expiry", 3);
  const warningSessions = getSetting("warning_sessions_remaining", 3);
  const daysRemaining = Math.ceil((subscription.end_date - now) / 86400);
  const sessionsRemaining = quota.sessions_cap - quota.sessions_used;
  if (daysRemaining <= warningDays) {
    warnings.push({ key: "attendance.expiresIn", params: { count: daysRemaining } });
  }
  if (sessionsRemaining - 1 < warningSessions) {
    warnings.push({ key: "attendance.sessionsAfterVisit", params: { count: sessionsRemaining - 1 } });
  }
  incrementSessionsUsed(quota.id);
  const updatedQuota = {
    ...quota,
    sessions_used: quota.sessions_used + 1
  };
  const status = warnings.length > 0 ? "warning" : "allowed";
  createLog({
    member_id: memberFinal.id,
    scanned_value: scanKey,
    method,
    status,
    reason_code: "ok"
  });
  return {
    status,
    reasonCode: "ok",
    member: memberFinal,
    subscription,
    quota: updatedQuota,
    warnings: warnings.length > 0 ? warnings : void 0
  };
}
const SERIAL_PREFIX = "";
const SERIAL_PAD = 5;
function formatSerial(num) {
  return `${SERIAL_PREFIX}${String(num).padStart(SERIAL_PAD, "0")}`;
}
function resolveNextSerial() {
  const maxExisting = getMaxSerialNumber();
  let next = getSetting("next_card_serial", 1);
  if (!Number.isFinite(next) || next < 1) {
    next = 1;
  }
  if (next <= maxExisting) {
    next = maxExisting + 1;
  }
  return next;
}
function getNextCardSerialPreview() {
  const next = resolveNextSerial();
  return formatSerial(next);
}
function allocateCardCodes(count) {
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("Count must be a positive number");
  }
  const startNumber = resolveNextSerial();
  const endNumber = startNumber + count - 1;
  const codes = Array.from(
    { length: count },
    (_, index) => formatSerial(startNumber + index)
  );
  setSetting("next_card_serial", endNumber + 1);
  return {
    codes,
    from: formatSerial(startNumber),
    to: formatSerial(endNumber),
    startNumber,
    endNumber
  };
}
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const GRID_COLUMNS = 2;
const GRID_ROWS = 5;
const PAGE_MARGIN = 28;
const TEXT_SIZE = 12;
const TEXT_MARGIN = 6;
const MAX_QR_SIZE = 130;
async function generateCardBatchFiles(codes, from, to) {
  if (!codes.length) {
    throw new Error("No codes provided");
  }
  const pdfLib = getPdfLib();
  const pdfDoc = await pdfLib.PDFDocument.create();
  const font = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica);
  const cellWidth = (A4_WIDTH - PAGE_MARGIN * 2) / GRID_COLUMNS;
  const cellHeight = (A4_HEIGHT - PAGE_MARGIN * 2) / GRID_ROWS;
  const qrSize = Math.min(
    MAX_QR_SIZE,
    cellWidth - 20,
    cellHeight - (TEXT_SIZE + TEXT_MARGIN * 2 + 10)
  );
  for (let i = 0; i < codes.length; i++) {
    const pageIndex = Math.floor(i / (GRID_COLUMNS * GRID_ROWS));
    const indexInPage = i % (GRID_COLUMNS * GRID_ROWS);
    if (indexInPage === 0) {
      pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    }
    const page = pdfDoc.getPage(pageIndex);
    const row = Math.floor(indexInPage / GRID_COLUMNS);
    const col = indexInPage % GRID_COLUMNS;
    const cellLeft = PAGE_MARGIN + col * cellWidth;
    const cellTop = A4_HEIGHT - PAGE_MARGIN - row * cellHeight;
    const code = codes[i];
    const dataUrl = await QRCode__namespace.toDataURL(code, {
      width: 300,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" }
    });
    const pngBytes = Buffer.from(dataUrl.split(",")[1], "base64");
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const qrX = cellLeft + (cellWidth - qrSize) / 2;
    const qrY = cellTop - TEXT_MARGIN - qrSize;
    page.drawImage(pngImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    const textWidth = font.widthOfTextAtSize(code, TEXT_SIZE);
    const textX = cellLeft + (cellWidth - textWidth) / 2;
    const textY = qrY - TEXT_MARGIN - TEXT_SIZE;
    page.drawText(code, { x: textX, y: textY, size: TEXT_SIZE, font });
  }
  const pdfBytes = await pdfDoc.save();
  const outputDir = path.join(getUserDataPath(), "print-batches");
  fs.mkdirSync(outputDir, { recursive: true });
  const pdfPath = path.join(outputDir, `GymFlow-Cards-${from}-to-${to}.pdf`);
  fs.writeFileSync(pdfPath, pdfBytes);
  const csvPath = path.join(outputDir, `GymFlow-Cards-${from}-to-${to}.csv`);
  const csvContent = ["card_code", ...codes].join("\n");
  fs.writeFileSync(csvPath, csvContent, "utf8");
  return { pdfPath, csvPath };
}
class WhatsAppService extends events.EventEmitter {
  client = null;
  isReady = false;
  connectInFlight = null;
  authPath = path.join(electron.app.getPath("userData"), "wwebjs_auth");
  status = {
    connected: false,
    authenticated: false,
    qrCode: null,
    error: null
  };
  constructor() {
    super();
    this.initialize();
  }
  resolveWindowsChromeExecutable() {
    if (process.platform !== "win32") {
      return null;
    }
    const envCandidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      process.env.CHROME_PATH
    ].filter(Boolean);
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || "";
    const pathCandidates = [
      ...envCandidates,
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      localAppData ? path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe") : ""
    ].filter(Boolean);
    for (const candidate of pathCandidates) {
      try {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch {
      }
    }
    return null;
  }
  initialize() {
    const puppeteerConfig = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ]
    };
    const windowsChromePath = this.resolveWindowsChromeExecutable();
    if (windowsChromePath) {
      puppeteerConfig.executablePath = windowsChromePath;
    }
    this.client = new whatsappWeb_js.Client({
      authStrategy: new whatsappWeb_js.LocalAuth({ dataPath: this.authPath }),
      puppeteer: puppeteerConfig
    });
    this.client.on("qr", (qr) => {
      console.log("WhatsApp QR Code received");
      this.status.qrCode = qr;
      this.status.connected = true;
      this.status.authenticated = false;
      this.emit("qr", qr);
      this.emit("status", { ...this.status });
    });
    this.client.on("ready", () => {
      console.log("WhatsApp client is ready");
      this.isReady = true;
      this.status.connected = true;
      this.status.authenticated = true;
      this.status.error = null;
      this.emit("status", { ...this.status });
    });
    this.client.on("disconnected", (reason) => {
      console.log("WhatsApp client disconnected:", reason);
      this.isReady = false;
      this.status.connected = false;
      this.status.authenticated = false;
      this.status.error = String(reason || "");
      this.emit("status", { ...this.status });
    });
    this.client.on("auth_failure", (msg) => {
      console.error("WhatsApp authentication failed:", msg);
      this.isReady = false;
      this.status.connected = false;
      this.status.authenticated = false;
      this.status.error = msg;
      this.emit("status", { ...this.status });
    });
  }
  cleanupAuthLocks() {
    const sessionPath = path.join(this.authPath, "session");
    const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie"];
    for (const fileName of lockFiles) {
      const fullPath = path.join(sessionPath, fileName);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { force: true });
        } catch {
        }
      }
    }
  }
  async resetClient() {
    if (this.client) {
      try {
        this.client.removeAllListeners();
        await this.client.destroy();
      } catch {
      }
      this.client = null;
    }
    this.isReady = false;
    this.status.connected = false;
    this.status.authenticated = false;
    this.status.qrCode = null;
    this.initialize();
  }
  async connect() {
    if (this.status.authenticated) {
      return { success: true };
    }
    if (this.connectInFlight) {
      return this.connectInFlight;
    }
    this.connectInFlight = (async () => {
      const withTimeout = async (promise, timeoutMs) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WhatsApp connection timed out"));
        }, timeoutMs);
        promise.then((result) => {
          clearTimeout(timeout);
          resolve(result);
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      try {
        if (!this.client) {
          this.initialize();
        }
        await withTimeout(this.client.initialize(), 45e3);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("WhatsApp connect error:", message);
        if (message.includes("already running") || message.includes("Singleton")) {
          try {
            this.cleanupAuthLocks();
            await this.resetClient();
            await withTimeout(this.client.initialize(), 45e3);
            this.status.error = null;
            this.emit("status", { ...this.status });
            return { success: true };
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
            this.status.error = retryMessage;
            this.emit("status", { ...this.status });
            return { success: false, error: retryMessage };
          }
        }
        this.status.error = message;
        this.emit("status", { ...this.status });
        return { success: false, error: message };
      } finally {
        this.connectInFlight = null;
      }
    })();
    return this.connectInFlight;
  }
  async disconnect() {
    try {
      if (this.client) {
        await this.client.destroy();
        this.isReady = false;
        this.client = null;
      }
      this.status.connected = false;
      this.status.authenticated = false;
      this.status.qrCode = null;
      this.emit("status", { ...this.status });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status.error = message;
      this.emit("status", { ...this.status });
      return { success: false, error: message };
    }
  }
  formatPhoneForWhatsApp(phone) {
    let cleaned = phone.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("00")) {
      cleaned = "+" + cleaned.substring(2);
    } else if (cleaned.startsWith("0") && !cleaned.startsWith("00")) {
      cleaned = "+20" + cleaned.substring(1);
    } else if (!cleaned.startsWith("+")) {
      cleaned = "+20" + cleaned;
    }
    const whatsappId = cleaned.replace("+", "") + "@c.us";
    return whatsappId;
  }
  async sendMessage(phone, message) {
    if (!this.client || !this.isReady) {
      throw new Error("WhatsApp client is not ready");
    }
    try {
      const whatsappId = this.formatPhoneForWhatsApp(phone);
      await this.client.sendMessage(whatsappId, message);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
  async sendImage(phone, imagePath, caption) {
    if (!this.client || !this.isReady) {
      throw new Error("WhatsApp client is not ready");
    }
    try {
      const MessageMedia = require("whatsapp-web.js").MessageMedia;
      const whatsappId = this.formatPhoneForWhatsApp(phone);
      const media = MessageMedia.fromFilePath(imagePath);
      await this.client.sendMessage(whatsappId, media, { caption });
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp image:", error);
      throw new Error(`Failed to send image: ${error.message}`);
    }
  }
  async isRegistered(phone) {
    if (!this.client || !this.isReady) {
      throw new Error("WhatsApp client is not ready");
    }
    try {
      const whatsappId = this.formatPhoneForWhatsApp(phone);
      const numberId = whatsappId.replace("@c.us", "");
      const isRegistered = await this.client.isRegisteredUser(numberId);
      return isRegistered;
    } catch (error) {
      console.error("Failed to check WhatsApp registration:", error);
      return false;
    }
  }
  getStatus() {
    return { ...this.status };
  }
  async sendMembershipQR(phone, memberName, qrCodePath, cardCode) {
    const codeLine = cardCode ? `
رقم العضوية: ${cardCode}` : "";
    const message = `مرحباً ${memberName}!

هذا هو رمز QR الخاص بعضويتك.${codeLine}
يرجى إظهاره عند الدخول للنادي.`;
    return await this.sendImage(phone, qrCodePath, message);
  }
  async sendRenewalReminder(phone, memberName, expiryDate) {
    const message = `عزيزي/عزيزتي ${memberName},

تنتهي عضويتك في ${expiryDate}.
يرجى تجديد اشتراكك قريباً لتجنب انقطاع الخدمة.

شكراً لك!`;
    return await this.sendMessage(phone, message);
  }
  async sendWelcomeMessage(phone, memberName, gymName) {
    const message = `مرحباً ${memberName}! 👋

نرحب بك في ${gymName}!
نتمنى لك تجربة رائعة معنا.

إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.`;
    return await this.sendMessage(phone, message);
  }
}
const whatsappService = new WhatsAppService();
function safeStringify(value) {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function getLogFilePath() {
  if (!electron.app.isReady()) return null;
  const logDir = path.join(electron.app.getPath("userData"), "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return path.join(logDir, "gymflow.log");
}
function logToFile(level, message, meta) {
  try {
    const logPath = getLogFilePath();
    if (!logPath) return;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const line = `[${timestamp}] [${level}] ${message}${meta !== void 0 ? ` | ${safeStringify(meta)}` : ""}
`;
    fs.appendFileSync(logPath, line);
  } catch {
  }
}
const STORE_FILE = path.join(electron.app.getPath("userData"), "secure-store.json");
const ALLOWED_KEYS = /* @__PURE__ */ new Set(["session_token"]);
function loadStore() {
  if (!fs.existsSync(STORE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function saveStore(store) {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(store), { encoding: "utf8", mode: 384 });
}
function ensureAllowedKey(key) {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error("Invalid secure storage key");
  }
}
function requireEncryption() {
  if (!electron.safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure storage encryption is not available");
  }
}
function getSecureItem(key) {
  ensureAllowedKey(key);
  requireEncryption();
  const store = loadStore();
  const encrypted = store[key];
  if (!encrypted) {
    return null;
  }
  const buffer = Buffer.from(encrypted, "base64");
  return electron.safeStorage.decryptString(buffer);
}
function setSecureItem(key, value) {
  ensureAllowedKey(key);
  requireEncryption();
  const store = loadStore();
  const encrypted = electron.safeStorage.encryptString(value);
  store[key] = encrypted.toString("base64");
  saveStore(store);
}
function deleteSecureItem(key) {
  ensureAllowedKey(key);
  if (!fs.existsSync(STORE_FILE)) {
    return;
  }
  const store = loadStore();
  if (!(key in store)) {
    return;
  }
  delete store[key];
  if (Object.keys(store).length === 0) {
    fs.rmSync(STORE_FILE, { force: true });
    return;
  }
  saveStore(store);
}
let whatsappForwardersRegistered = false;
function registerWhatsAppForwarders() {
  if (whatsappForwardersRegistered) return;
  whatsappForwardersRegistered = true;
  whatsappService.on("qr", (qr) => {
    electron.BrowserWindow.getAllWindows().forEach((win) => win.webContents.send("whatsapp:qr", qr));
  });
  whatsappService.on("status", (status) => {
    electron.BrowserWindow.getAllWindows().forEach(
      (win) => win.webContents.send("whatsapp:status", status)
    );
  });
}
function parseStartDate(value) {
  if (value === null || value === void 0) return void 0;
  const parseNumericDate = (num) => {
    if (!Number.isFinite(num)) return void 0;
    if (num > 1e12) return Math.floor(num / 1e3);
    if (num > 1e9) return Math.floor(num);
    if (num > 2e4) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      return Math.floor((excelEpoch + num * 864e5) / 1e3);
    }
    return void 0;
  };
  if (typeof value === "number") {
    return parseNumericDate(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return void 0;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return parseNumericDate(Number(trimmed));
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return Math.floor(parsed.getTime() / 1e3);
    }
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Math.floor(value.getTime() / 1e3);
  }
  return void 0;
}
async function sendOtpMessage(phone, code, purpose, allowManualInProduction = false) {
  const status = whatsappService.getStatus();
  const message = purpose === "verify" ? `Your GymFlow verification code is ${code}` : `Your GymFlow password reset code is ${code}`;
  if (status.authenticated) {
    try {
      const ok = await whatsappService.sendMessage(phone, message);
      if (ok) return { sentVia: "whatsapp" };
    } catch {
    }
  }
  if (electron.app.isPackaged && !allowManualInProduction) return { sentVia: "manual" };
  return { sentVia: "manual", code };
}
function getImportTemplatePath() {
  if (electron.app.isPackaged) {
    const packagedPath = path.join(process.resourcesPath, "Docs", "spreadsheet.xlsx");
    if (fs.existsSync(packagedPath)) return packagedPath;
    const fallbackPath = path.join(process.resourcesPath, "spreadsheet.xlsx");
    if (fs.existsSync(fallbackPath)) return fallbackPath;
  }
  const devPath = path.join(process.cwd(), "..", "Docs", "spreadsheet.xlsx");
  if (fs.existsSync(devPath)) return devPath;
  throw new Error("Template spreadsheet not found");
}
function ensurePathInBaseDir(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedBase, resolvedTarget);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid photo path");
  }
}
function copyDirSync(source, destination) {
  if (!fs.existsSync(source)) return;
  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.mkdirSync(destination, { recursive: true });
  const entries = fs.readdirSync(source);
  for (const entry of entries) {
    const srcPath = path.join(source, entry);
    const destPath = path.join(destination, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
function registerIpcHandlers() {
  registerWhatsAppForwarders();
  electron.ipcMain.handle("owner:getStatus", (_event, token) => {
    const hasOwner = getOwnerCount() > 0;
    const onboardingComplete = getSetting("onboarding_complete", false);
    if (!hasOwner) {
      return { hasOwner: false, onboardingComplete: false, authenticated: false };
    }
    if (!token) {
      return { hasOwner: true, onboardingComplete, authenticated: false };
    }
    const session = getSessionByToken(token);
    if (!session || session.revoked_at) {
      return { hasOwner: true, onboardingComplete, authenticated: false };
    }
    const now = Math.floor(Date.now() / 1e3);
    if (session.expires_at && session.expires_at <= now) {
      return { hasOwner: true, onboardingComplete, authenticated: false };
    }
    const owner = getOwnerById(session.owner_id);
    return {
      hasOwner: true,
      onboardingComplete,
      authenticated: true,
      owner: owner ? { id: owner.id, phone: owner.phone } : null
    };
  });
  electron.ipcMain.handle("owner:register", async (_event, phone, password, name) => {
    const existing = getOwnerByPhone(phone);
    if (existing) return { success: false, error: "Owner already exists" };
    const onboardingComplete = getSetting("onboarding_complete", false);
    const allowManualOtp = !onboardingComplete;
    const passwordHash = bcryptjs.hashSync(password, 10);
    const owner = createOwner(phone, passwordHash, name);
    const otp = createOtp(phone, "verify");
    const sent = await sendOtpMessage(phone, otp.code, "verify", allowManualOtp);
    if (electron.app.isPackaged && sent.sentVia !== "whatsapp" && !allowManualOtp) {
      try {
        deleteOtpById(otp.id);
      } catch {
      }
      try {
        deleteOwnerById(owner.id);
      } catch {
      }
      return { success: false, error: "WhatsApp not connected" };
    }
    return { success: true, ownerId: owner.id, ...sent };
  });
  electron.ipcMain.handle("owner:verifyOtp", (_event, phone, code, purpose) => {
    const ok = verifyOtp(phone, code, purpose || "verify");
    if (!ok) return { success: false, error: "Invalid or expired code" };
    if ((purpose || "verify") === "verify") {
      const owner = getOwnerByPhone(phone);
      if (owner) markOwnerVerified(owner.id);
    }
    return { success: true };
  });
  electron.ipcMain.handle("owner:login", (_event, phone, password) => {
    const owner = getOwnerByPhone(phone);
    if (!owner) return { success: false, error: "Owner not found" };
    if (!owner.verified_at) return { success: false, error: "Account not verified" };
    const ok = bcryptjs.compareSync(password, owner.password_hash);
    if (!ok) return { success: false, error: "Invalid credentials" };
    const session = createSession(owner.id);
    updateLastLogin(owner.id);
    return { success: true, token: session.token };
  });
  electron.ipcMain.handle("owner:logout", (_event, token) => {
    revokeSession(token);
    return { success: true };
  });
  electron.ipcMain.handle("secureStore:get", (_event, key) => {
    try {
      return { success: true, value: getSecureItem(key) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("secureStore:set", (_event, key, value) => {
    try {
      setSecureItem(key, value);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("secureStore:delete", (_event, key) => {
    try {
      deleteSecureItem(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("owner:requestPasswordReset", async (_event, phone) => {
    const owner = getOwnerByPhone(phone);
    if (!owner) return { success: false, error: "Owner not found" };
    if (electron.app.isPackaged && !whatsappService.getStatus().authenticated) {
      return { success: false, error: "WhatsApp not connected" };
    }
    const otp = createOtp(phone, "reset");
    const sent = await sendOtpMessage(phone, otp.code, "reset", false);
    if (electron.app.isPackaged && sent.sentVia !== "whatsapp") {
      try {
        deleteOtpById(otp.id);
      } catch {
      }
      return { success: false, error: "WhatsApp not connected" };
    }
    return { success: true, ...sent };
  });
  electron.ipcMain.handle(
    "owner:resetPassword",
    (_event, phone, code, newPassword) => {
      const ok = verifyOtp(phone, code, "reset");
      if (!ok) return { success: false, error: "Invalid or expired code" };
      const owner = getOwnerByPhone(phone);
      if (!owner) return { success: false, error: "Owner not found" };
      const passwordHash = bcryptjs.hashSync(newPassword, 10);
      updateOwnerPassword(owner.id, passwordHash);
      return { success: true };
    }
  );
  electron.ipcMain.handle("owner:completeOnboarding", (_event, settings) => {
    setSettings(settings);
    setSetting("onboarding_complete", true);
    return { success: true };
  });
  electron.ipcMain.handle(
    "owner:changePassword",
    (_event, token, currentPassword, newPassword) => {
      const session = getSessionByToken(token);
      if (!session || session.revoked_at) return { success: false, error: "Not authenticated" };
      const now = Math.floor(Date.now() / 1e3);
      if (session.expires_at && session.expires_at < now)
        return { success: false, error: "Session expired" };
      const owner = getOwnerById(session.owner_id);
      if (!owner) return { success: false, error: "Owner not found" };
      const ok = bcryptjs.compareSync(currentPassword, owner.password_hash);
      if (!ok) return { success: false, error: "wrong_password" };
      const passwordHash = bcryptjs.hashSync(newPassword, 10);
      updateOwnerPassword(owner.id, passwordHash);
      return { success: true };
    }
  );
  electron.ipcMain.handle("members:getAll", () => getAllMembers());
  electron.ipcMain.handle("members:getById", (_event, id) => getMemberById(id));
  electron.ipcMain.handle("members:getNextSerial", () => generateNextCardCode());
  electron.ipcMain.handle("members:create", (_event, data) => createMember(data));
  electron.ipcMain.handle("members:update", (_event, id, data) => updateMember(id, data));
  electron.ipcMain.handle("members:delete", (_event, id) => deleteMember(id));
  electron.ipcMain.handle("members:search", (_event, query) => searchMembers(query));
  electron.ipcMain.handle(
    "subscriptions:getByMemberId",
    (_event, memberId) => getSubscriptionsByMemberId(memberId)
  );
  electron.ipcMain.handle("subscriptions:create", (_event, data) => {
    const sessionsPerMonth = data?.sessions_per_month !== void 0 && Number.isFinite(Number(data.sessions_per_month)) ? Number(data.sessions_per_month) : void 0;
    return createSubscription({
      ...data,
      sessions_per_month: sessionsPerMonth
    });
  });
  electron.ipcMain.handle("subscriptions:renew", (_event, memberId, data) => {
    const sessionsPerMonth = data?.sessions_per_month !== void 0 && Number.isFinite(Number(data.sessions_per_month)) ? Number(data.sessions_per_month) : void 0;
    return renewSubscription(
      memberId,
      data.plan_months,
      data.price_paid,
      sessionsPerMonth
    );
  });
  electron.ipcMain.handle(
    "subscriptions:cancel",
    (_event, id) => cancelSubscription(id)
  );
  electron.ipcMain.handle(
    "subscriptions:updatePricePaid",
    (_event, id, pricePaid) => updateSubscriptionPricePaid(id, pricePaid)
  );
  electron.ipcMain.handle(
    "subscriptions:freeze",
    (_event, subscriptionId, days) => createSubscriptionFreeze(subscriptionId, days)
  );
  electron.ipcMain.handle(
    "subscriptions:getFreezes",
    (_event, subscriptionId) => getFreezesBySubscriptionId(subscriptionId)
  );
  electron.ipcMain.handle(
    "attendance:check",
    (_event, scannedValue, method) => checkAttendance(scannedValue, method || "scan")
  );
  electron.ipcMain.handle("attendance:getTodayLogs", () => getTodayLogs());
  electron.ipcMain.handle(
    "attendance:getLogsByMember",
    (_event, memberId) => getLogsByMember(memberId)
  );
  electron.ipcMain.handle("attendance:getTodayStats", () => getTodayStats());
  electron.ipcMain.handle(
    "quotas:getCurrentByMember",
    (_event, memberId) => getCurrentQuota(memberId)
  );
  electron.ipcMain.handle(
    "quotas:getHistory",
    (_event, memberId) => getQuotaHistory(memberId)
  );
  electron.ipcMain.handle("guestpasses:create", (_event, data) => createGuestPass(data));
  electron.ipcMain.handle(
    "guestpasses:list",
    (_event, limit) => listGuestPasses(limit || 50)
  );
  electron.ipcMain.handle(
    "guestpasses:getByCode",
    (_event, code) => getGuestPassByCode(code)
  );
  electron.ipcMain.handle(
    "guestpasses:markUsed",
    (_event, code) => markGuestPassUsed(code)
  );
  electron.ipcMain.handle("settings:get", (_event, key) => getSetting(key));
  electron.ipcMain.handle("settings:getAll", () => getAllSettings());
  electron.ipcMain.handle(
    "settings:set",
    (_event, key, value) => setSetting(key, value)
  );
  electron.ipcMain.handle(
    "settings:setAll",
    (_event, settings) => setSettings(settings)
  );
  electron.ipcMain.handle("settings:resetDefaults", () => resetToDefaults());
  electron.ipcMain.handle("whatsapp:getStatus", () => whatsappService.getStatus());
  electron.ipcMain.handle("whatsapp:connect", async () => whatsappService.connect());
  electron.ipcMain.handle("whatsapp:disconnect", async () => whatsappService.disconnect());
  electron.ipcMain.handle("whatsapp:getQueueStatus", () => getQueueStats());
  electron.ipcMain.handle(
    "whatsapp:getQueueMessages",
    (_event, limit) => getPendingMessages(limit)
  );
  electron.ipcMain.handle("whatsapp:requeueFailed", () => {
    const count = requeueFailedMessages();
    return { success: true, count };
  });
  electron.ipcMain.handle("whatsapp:sendMessage", async (_event, memberId, type) => {
    try {
      const member = getMemberById(memberId);
      if (!member) return { success: false, error: "Member not found" };
      if (type === "welcome") {
        const template = getSetting(
          "whatsapp_template_welcome",
          "Welcome to GymFlow, {{name}}!"
        );
        const message = template.replace("{{name}}", member.name);
        await whatsappService.sendMessage(member.phone, message);
        return { success: true };
      }
      if (type === "renewal") {
        const subscription = getActiveSubscription(memberId);
        if (!subscription) return { success: false, error: "No active subscription" };
        const now = Math.floor(Date.now() / 1e3);
        const days = Math.max(0, Math.ceil((subscription.end_date - now) / 86400));
        const template = getSetting(
          "whatsapp_template_renewal",
          "Hi {{name}}, your subscription expires in {{days}} days."
        );
        const message = template.replace("{{name}}", member.name).replace("{{days}}", String(days));
        await whatsappService.sendMessage(member.phone, message);
        return { success: true };
      }
      if (type === "low_sessions") {
        const quota = getCurrentQuota(memberId);
        if (!quota) return { success: false, error: "No active quota" };
        const sessions = Math.max(0, quota.sessions_cap - quota.sessions_used);
        const template = getSetting(
          "whatsapp_template_low_sessions",
          "Hi {{name}}, you have only {{sessions}} sessions remaining."
        );
        const message = template.replace("{{name}}", member.name).replace("{{sessions}}", String(sessions));
        await whatsappService.sendMessage(member.phone, message);
        return { success: true };
      }
      return { success: false, error: "Unknown message type" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("whatsapp:sendImmediate", async (_event, memberId) => {
    try {
      const member = getMemberById(memberId);
      if (!member) return { success: false, error: "Member not found" };
      const message = getSetting(
        "whatsapp_template_welcome",
        "Welcome to GymFlow, {{name}}!"
      );
      await whatsappService.sendMessage(member.phone, message.replace("{{name}}", member.name));
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle(
    "whatsapp:sendQRCode",
    async (_event, memberId, memberName, qrDataUrl, code) => {
      try {
        const member = getMemberById(memberId);
        if (!member) return { success: false, error: "Member not found" };
        const userDataPath = getUserDataPath();
        const tempDir = path.join(userDataPath, "temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const filePath = path.join(tempDir, `${memberId}-qr.png`);
        const base64Data = qrDataUrl.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        const cardCode = code && code.trim() || member.card_code?.trim() || memberId;
        const ok = await whatsappService.sendMembershipQR(member.phone, memberName, filePath, cardCode);
        return { success: ok };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );
  electron.ipcMain.handle("import:selectFile", async () => {
    const result = await electron.dialog.showOpenDialog({
      title: "Select Import File",
      filters: [{ name: "Excel or CSV", extensions: ["xlsx", "xls", "csv"] }],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: "Cancelled" };
    }
    return { success: true, path: result.filePaths[0] };
  });
  electron.ipcMain.handle("import:parseExcel", async (_event, filePath) => {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const valid = [];
      const invalid = [];
      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const getValue = (key) => row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
        const name = getValue("name") ?? getValue("Name") ?? getValue("Full_Name") ?? row["الاسم"];
        const phone = getValue("phone") ?? getValue("Phone") ?? getValue("Phone_Number") ?? row["رقم الهاتف"];
        const genderRaw = getValue("gender") ?? getValue("Gender");
        const accessTierRaw = getValue("access_tier") ?? getValue("Access_Tier");
        const planMonthsRaw = getValue("plan_months") ?? getValue("Plan_Months") ?? getValue("Plan_Duration_Months");
        const sessionsPerMonthRaw = getValue("sessions_per_month") ?? getValue("Sessions_Per_Month");
        const startDateRaw = getValue("start_date") ?? getValue("Start_Date");
        const priceRaw = getValue("price_paid") ?? getValue("Price_Paid");
        const cardCodeRaw = getValue("card_code") ?? getValue("Card_Code") ?? row["رمز البطاقة"];
        const addressRaw = getValue("address") ?? getValue("Address") ?? row["العنوان"];
        const errors = [];
        const gender = String(genderRaw || "").toLowerCase();
        const access_tier = String(accessTierRaw || "A").toUpperCase();
        const plan_months = Number(planMonthsRaw);
        const sessions_per_month = sessionsPerMonthRaw !== void 0 && sessionsPerMonthRaw !== null && String(sessionsPerMonthRaw).trim() !== "" ? Number(sessionsPerMonthRaw) : void 0;
        const start_date = parseStartDate(startDateRaw);
        const price_paid = priceRaw !== void 0 && priceRaw !== null && String(priceRaw).trim() !== "" ? Number(priceRaw) : void 0;
        const card_code = cardCodeRaw ? String(cardCodeRaw).trim() : "";
        const address = addressRaw ? String(addressRaw).trim() : "";
        const cardCodePattern = /^\d{5}$/;
        if (!name) errors.push("Name is required");
        if (!phone) errors.push("Phone is required");
        if (!["male", "female"].includes(gender)) errors.push("Gender must be male or female");
        if (!["A", "B"].includes(access_tier)) errors.push("Access tier must be A or B");
        if (![1, 3, 6, 12].includes(plan_months))
          errors.push("Plan months must be 1, 3, 6, or 12");
        if (!card_code) errors.push("Card code is required");
        if (card_code && !cardCodePattern.test(card_code))
          errors.push("Card code must match format 00000");
        if (sessions_per_month !== void 0 && (!Number.isFinite(sessions_per_month) || sessions_per_month < 1)) {
          errors.push("Sessions per month must be a positive number");
        }
        if (errors.length > 0) {
          invalid.push({ row: rowNumber, errors });
          return;
        }
        valid.push({
          row: rowNumber,
          name,
          phone,
          gender,
          access_tier,
          plan_months,
          sessions_per_month,
          start_date,
          price_paid,
          card_code,
          address
        });
      });
      return { valid, invalid, total: rows.length };
    } catch (error) {
      return { valid: [], invalid: [], total: 0, error: String(error) };
    }
  });
  electron.ipcMain.handle("import:execute", async (_event, rows) => {
    const errors = [];
    let success = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const member = getMemberByPhone(String(row.phone));
        let memberId;
        if (member) {
          const updated = updateMember(member.id, {
            name: row.name,
            phone: row.phone,
            gender: row.gender,
            access_tier: row.access_tier || "A",
            card_code: row.card_code || void 0,
            address: row.address || void 0
          });
          memberId = updated.id;
        } else {
          const created = createMember({
            name: row.name,
            phone: row.phone,
            gender: row.gender,
            access_tier: row.access_tier || "A",
            card_code: row.card_code || void 0,
            address: row.address || void 0
          });
          memberId = created.id;
        }
        createSubscription({
          member_id: memberId,
          plan_months: row.plan_months,
          price_paid: row.price_paid,
          start_date: row.start_date,
          sessions_per_month: row.sessions_per_month
        });
        success++;
      } catch (error) {
        failed++;
        errors.push({ row: i + 1, error: String(error) });
      }
    }
    return { success, failed, errors };
  });
  electron.ipcMain.handle("import:getTemplate", () => {
    return getImportTemplatePath();
  });
  electron.ipcMain.handle("import:downloadTemplate", async () => {
    const result = await electron.dialog.showSaveDialog({
      title: "Save Import Template",
      defaultPath: "members-template.csv",
      filters: [{ name: "CSV File", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, error: "Cancelled" };
    }
    try {
      const XLSX = await import("xlsx");
      const templatePath = getImportTemplatePath();
      const workbook = XLSX.readFile(templatePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      fs.writeFileSync(result.filePath, csv, "utf8");
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("cards:getNextPreview", () => {
    try {
      const next = getNextCardSerialPreview();
      return { success: true, next };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("cards:generateBatch", async (_event, payload) => {
    try {
      const count = Number(payload?.count);
      const { codes, from, to } = allocateCardCodes(count);
      const { pdfPath, csvPath } = await generateCardBatchFiles(codes, from, to);
      return { success: true, from, to, codes, pdfPath, csvPath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("app:openDataFolder", () => {
    electron.shell.openPath(getUserDataPath());
    return { success: true };
  });
  electron.ipcMain.handle("app:showItemInFolder", (_event, filePath) => {
    electron.shell.showItemInFolder(filePath);
    return { success: true };
  });
  electron.ipcMain.handle("app:openExternal", (_event, url) => {
    electron.shell.openExternal(url);
    return { success: true };
  });
  electron.ipcMain.handle("app:backup", async (_event, destPath) => {
    const userDataPath = getUserDataPath();
    path.join(userDataPath, "gymflow.db");
    const photosPath = getPhotosPath();
    if (!destPath) {
      const result = await electron.dialog.showSaveDialog({
        title: "Backup Database",
        defaultPath: `gymflow-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`,
        filters: [{ name: "SQLite Database", extensions: ["db"] }]
      });
      if (result.canceled || !result.filePath) {
        return { success: false, error: "Cancelled" };
      }
      destPath = result.filePath;
    }
    try {
      const database = getDatabase();
      await database.backup(destPath);
      const photosBackupPath = `${destPath}.photos`;
      if (fs.existsSync(photosPath)) {
        copyDirSync(photosPath, photosBackupPath);
      }
      return { success: true, path: destPath, photosPath: photosBackupPath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("app:restore", async (_event, srcPath) => {
    if (!srcPath) {
      const result = await electron.dialog.showOpenDialog({
        title: "Restore Database",
        filters: [{ name: "SQLite Database", extensions: ["db"] }],
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: "Cancelled" };
      }
      srcPath = result.filePaths[0];
    }
    const userDataPath = getUserDataPath();
    const dbPath = path.join(userDataPath, "gymflow.db");
    const photosPath = getPhotosPath();
    try {
      const backupPath = path.join(userDataPath, `gymflow-pre-restore-${Date.now()}.db`);
      if (fs.existsSync(dbPath)) {
        const database = getDatabase();
        await database.backup(backupPath);
      }
      closeDatabase();
      fs.copyFileSync(srcPath, dbPath);
      initDatabase();
      const photosBackupPath = `${srcPath}.photos`;
      if (fs.existsSync(photosBackupPath)) {
        copyDirSync(photosBackupPath, photosPath);
      }
      return { success: true, backupPath };
    } catch (error) {
      try {
        initDatabase();
      } catch {
      }
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("app:getVersion", () => electron.app.getVersion());
  electron.ipcMain.handle("app:checkForUpdates", async () => {
    try {
      return await getUpdateInfo();
    } catch (error) {
      return { available: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("app:downloadUpdate", async (_event, downloadUrl) => {
    try {
      const downloadDir = path.join(electron.app.getPath("userData"), "updates");
      const filePath = await downloadFile(downloadUrl, downloadDir);
      await launchInstaller(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("app:logError", (_event, payload) => {
    logToFile("ERROR", payload?.message || "Renderer error", payload);
    return { success: true };
  });
  electron.ipcMain.handle("qrcode:generate", async (_event, memberId) => {
    try {
      const member = getMemberById(memberId);
      const qrValue = member?.card_code?.trim() || memberId;
      const dataUrl = await QRCode__namespace.toDataURL(qrValue, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" }
      });
      return { success: true, dataUrl, code: qrValue };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("photos:save", async (_event, dataUrl, memberId) => {
    try {
      const photosPath = getPhotosPath();
      if (!fs.existsSync(photosPath)) {
        fs.mkdirSync(photosPath, { recursive: true });
      }
      const fileName = `${memberId}.jpg`;
      const filePath = path.join(photosPath, fileName);
      ensurePathInBaseDir(photosPath, filePath);
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle(
    "reports:getDailyStats",
    (_event, days = 30) => getDailyAttendanceStats(days)
  );
  electron.ipcMain.handle("reports:getHourlyDistribution", () => getHourlyDistribution());
  electron.ipcMain.handle(
    "reports:getTopMembers",
    (_event, days = 30, limit = 10) => getTopMembers(days, limit)
  );
  electron.ipcMain.handle(
    "reports:getDenialReasons",
    (_event, days = 30) => getDenialReasons(days)
  );
  electron.ipcMain.handle("reports:getOverview", () => {
    const memberCount = getAllMembers().length;
    const activeSubscriptions = getActiveSubscriptionCount();
    const expiredSubscriptions = getExpiredSubscriptionCount();
    const todayStats = getTodayStats();
    const queueStats = getQueueStats();
    return { memberCount, activeSubscriptions, expiredSubscriptions, todayStats, queueStats };
  });
  electron.ipcMain.handle(
    "reports:getExpiringSubscriptions",
    (_event, days = 7) => getExpiringSubscriptions(days)
  );
  electron.ipcMain.handle(
    "reports:getLowSessionMembers",
    (_event, threshold = 3) => getMembersWithLowSessions(threshold)
  );
  electron.ipcMain.handle("income:getSummary", () => getIncomeSummary());
  electron.ipcMain.handle(
    "income:getRecent",
    (_event, limit) => getRecentIncome(limit || 20)
  );
}
const UPDATE_URL = "https://api.github.com/repos/MahmoudMosalm88/gymflow/releases/latest";
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1e3;
const DOWNLOAD_TIMEOUT_MS = 3e4;
const UPDATE_TIMEOUT_MS = 15e3;
let updateTimer = null;
let updateInFlight = null;
function compareVersions(a, b) {
  const toParts = (value) => value.split("-")[0].split(".").map((part) => Number.parseInt(part, 10)).map((part) => Number.isFinite(part) ? part : 0);
  const partsA = toParts(a);
  const partsB = toParts(b);
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
function resolveDownloadUrl(info) {
  if (info.downloadUrl) return info.downloadUrl;
  if (info.download_url) return info.download_url;
  if (info.url) return info.url;
  if (info.downloads) {
    const platformKey = process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux";
    return info.downloads[platformKey] || info.downloads[process.platform] || null;
  }
  return null;
}
function resolveFeedUrl(info) {
  return info.feedUrl || info.feed_url || null;
}
function fetchJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https.request : http.request;
    const req = client(url, { method: "GET", headers: { "User-Agent": "gymflow-updater" } }, (res) => {
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`Update check failed (${res.statusCode})`));
        res.resume();
        return;
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Update check timed out"));
    });
    req.end();
  });
}
function downloadFile(url, destinationDir) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https.request : http.request;
    const req = client(url, { method: "GET" }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(downloadFile(res.headers.location, destinationDir));
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`Update download failed (${res.statusCode})`));
        res.resume();
        return;
      }
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
      const fileName = path.basename(new URL(url).pathname) || `update-${Date.now()}`;
      const filePath = path.join(destinationDir, fileName);
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close(() => resolve(filePath));
      });
      fileStream.on("error", (error) => {
        reject(error);
      });
    });
    req.on("error", reject);
    req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      req.destroy(new Error("Update download timed out"));
    });
    req.end();
  });
}
async function launchInstaller(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  try {
    if (process.platform === "win32" || process.platform === "linux") {
      await electron.shell.openPath(filePath);
      electron.app.relaunch();
      electron.app.exit(0);
      return;
    }
    if (process.platform === "darwin") {
      await electron.shell.openPath(filePath);
      electron.app.relaunch();
      electron.app.exit(0);
      return;
    }
  } catch (error) {
    logToFile("ERROR", "Failed to launch installer", { error: String(error), filePath });
  }
  if (extension) {
    throw new Error("Unsupported update package");
  }
}
async function getUpdateInfo() {
  try {
    const release = await fetchJson(UPDATE_URL, UPDATE_TIMEOUT_MS);
    const tagVersion = (release.tag_name || "").replace(/^v/, "");
    if (!tagVersion) {
      return { available: false, error: "Update response missing version" };
    }
    const currentVersion = electron.app.getVersion();
    if (compareVersions(tagVersion, currentVersion) <= 0) {
      return { available: false, version: currentVersion };
    }
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const platformKey = process.platform === "win32" ? /\.exe$/i : process.platform === "darwin" ? /\.dmg$/i : /\.AppImage$/i;
    const asset = assets.find((a) => platformKey.test(a.name || ""));
    const downloadUrl = asset ? asset.browser_download_url : null;
    if (!downloadUrl) {
      return { available: false, error: "No matching installer for this platform" };
    }
    return { available: true, version: tagVersion, downloadUrl };
  } catch (error) {
    return { available: false, error: String(error) };
  }
}
async function checkForUpdates() {
  if (updateInFlight) {
    return updateInFlight;
  }
  updateInFlight = (async () => {
    try {
      const info = await getUpdateInfo();
      if (!info.available) return;
      electron.BrowserWindow.getAllWindows().forEach((win) => {
        try { win.webContents.send("app:updateAvailable", { version: info.version, downloadUrl: info.downloadUrl }); } catch {}
      });
      const { response } = await electron.dialog.showMessageBox({
        type: "info",
        message: "Update available",
        detail: `A newer version (${info.version}) is available. Would you like to update now?`,
        buttons: ["Update Now", "Later"]
      });
      if (response !== 0) {
        return;
      }
      const downloadDir = path.join(electron.app.getPath("userData"), "updates");
      const filePath = await downloadFile(info.downloadUrl, downloadDir);
      await launchInstaller(filePath);
    } catch (error) {
      logToFile("ERROR", "Auto-updater failed", { error: String(error) });
    } finally {
      updateInFlight = null;
    }
  })();
  return updateInFlight;
}
function startAutoUpdater() {
  if (updateTimer) return;
  checkForUpdates();
  updateTimer = setInterval(() => {
    checkForUpdates();
  }, UPDATE_CHECK_INTERVAL_MS);
}
let mainWindow = null;
let rendererRestartCount = 0;
let lastRendererCrashAt = 0;
const MAX_RENDERER_RESTARTS = 3;
const RENDERER_RESTART_WINDOW_MS = 6e4;
const DEFAULT_DEV_ORIGIN = "http://127.0.0.1:5176";
function getDevOrigin() {
  const rendererUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!rendererUrl) return DEFAULT_DEV_ORIGIN;
  try {
    return new URL(rendererUrl).origin;
  } catch {
    return DEFAULT_DEV_ORIGIN;
  }
}
function buildCsp(isDevMode, devOrigin) {
  if (isDevMode) {
    return [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${devOrigin}`,
      `style-src 'self' 'unsafe-inline' ${devOrigin} https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      `connect-src 'self' ws: ${devOrigin}`
    ].join("; ");
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'"
  ].join("; ");
}
function installCsp() {
  const devOrigin = getDevOrigin();
  const isDevMode = isDev();
  const policy = buildCsp(isDevMode, devOrigin);
  console.log("CSP installed:", { isDevMode, devOrigin });
  logToFile("INFO", "CSP installed", { isDevMode, devOrigin });
  electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders ?? {};
    responseHeaders["Content-Security-Policy"] = [policy];
    callback({ responseHeaders });
  });
}
function isDev() {
  return !electron.app.isPackaged || !!process.env["ELECTRON_RENDERER_URL"];
}
function loadRenderer() {
  if (!mainWindow) return;
  if (isDev() && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("Loading renderer from dev server:", process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    const filePath = path.join(__dirname, "../renderer/index.html");
    console.log("Loading renderer from file:", filePath);
    mainWindow.loadFile(filePath);
  }
}
function scheduleRendererReload(trigger) {
  if (!mainWindow) return;
  const now = Date.now();
  if (now - lastRendererCrashAt > RENDERER_RESTART_WINDOW_MS) {
    rendererRestartCount = 0;
  }
  lastRendererCrashAt = now;
  rendererRestartCount += 1;
  if (rendererRestartCount > MAX_RENDERER_RESTARTS) {
    logToFile("ERROR", "Renderer restart limit reached", { trigger });
    return;
  }
  logToFile("WARN", "Reloading renderer after failure", {
    trigger,
    attempt: rendererRestartCount
  });
  setTimeout(() => {
    loadRenderer();
  }, 1e3);
}
function createWindow() {
  const iconPath = path.join(__dirname, "../../build/icon.png");
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#f5f5f5",
    autoHideMenuBar: true,
    icon: electron.nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      logToFile("WARN", "Showing window via fallback timeout (ready-to-show did not fire)");
      mainWindow.show();
    }
  }, 1e4);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logToFile("ERROR", "did-fail-load", { errorCode, errorDescription, validatedURL });
    scheduleRendererReload("did-fail-load");
  });
  mainWindow.webContents.on("did-finish-load", () => {
    logToFile("INFO", "renderer loaded", { url: mainWindow?.webContents.getURL() });
    mainWindow?.webContents.setZoomFactor(1);
    mainWindow?.webContents.setVisualZoomLevelLimits(1, 1).catch(() => void 0);
    mainWindow?.show();
    mainWindow?.focus();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logToFile("ERROR", "render-process-gone", details);
    scheduleRendererReload("render-process-gone");
  });
  mainWindow.webContents.on("unresponsive", () => {
    logToFile("WARN", "renderer unresponsive");
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logToFile("ERROR", "renderer console", { level, message, line, sourceId });
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url === "about:blank") {
      return { action: "allow" };
    }
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
  loadRenderer();
}
electron.app.whenReady().then(() => {
  if (process.platform === "darwin") {
    const dockIcon = electron.nativeImage.createFromPath(path.join(__dirname, "../../build/icon.png"));
    if (!dockIcon.isEmpty()) electron.app.dock.setIcon(dockIcon);
  }
  if (process.platform === "win32") {
    electron.app.setAppUserModelId(isDev() ? process.execPath : "com.gymflow");
  }
  installCsp();
  console.log("Initializing database...");
  try {
    initDatabase();
    console.log("Database initialized successfully");
    logToFile("INFO", "Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    logToFile("ERROR", "Failed to initialize database", error);
    const { dialog } = require("electron");
    dialog.showErrorBox(
      "Database Initialization Failed",
      `GymFlow cannot start because the database failed to initialize.

Error: ${error instanceof Error ? error.message : String(error)}

The application will now exit.`
    );
    electron.app.quit();
    return;
  }
  console.log("Registering IPC handlers...");
  registerIpcHandlers();
  console.log("IPC handlers registered");
  logToFile("INFO", "IPC handlers registered");
  createWindow();
  if (!isDev()) {
    startAutoUpdater();
  }
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("will-quit", async () => {
  console.log("Cleaning up resources before quit...");
  electron.globalShortcut.unregisterAll();
  console.log("Global shortcuts unregistered");
  try {
    await whatsappService.disconnect();
    console.log("WhatsApp service disconnected");
  } catch (error) {
    console.error("Error disconnecting WhatsApp service:", error);
  }
  console.log("Closing database connection...");
  closeDatabase();
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  logToFile("ERROR", "uncaughtException", error);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  logToFile("ERROR", "unhandledRejection", reason);
});

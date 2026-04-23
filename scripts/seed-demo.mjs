/**
 * GymFlow Demo Account Seeder
 * Creates demosales@gymflow.app with 500 realistic Egyptian gym members
 * Run from repo root: node scripts/seed-demo.mjs
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const require = createRequire(join(repoRoot, "package.json"));

const { Client } = require("pg");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");

// ── Config ────────────────────────────────────────────────────────────────────
const DB_URL = "postgresql://gymflow_app:6rg2DwFpaW1w9zJsealVgIqs@localhost:5433/gymflow";
const DEMO_EMAIL = "demosales@gymflow.app";
const DEMO_PASSWORD = "GymFlow@Demo2026";
const ORG_NAME = "Elite Fitness Club";
const BRANCH_NAME = "Downtown Cairo";
const CHUNK_SIZE = 500;

// ── Firebase Admin ─────────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(readFileSync("/tmp/firebase-admin.json", "utf8"));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const auth = admin.auth();

// ── Name pools (Egyptian/Arabic names) ────────────────────────────────────────
const maleFirstNames = [
  "Ahmed","Mohamed","Mahmoud","Omar","Ali","Hassan","Hussein","Khaled","Youssef","Tarek",
  "Kareem","Mostafa","Ibrahim","Amr","Tamer","Sherif","Hossam","Wael","Ayman","Ramy",
  "Samer","Fady","Mina","George","Peter","Andrew","Michael","David","Joseph","Samuel",
  "Adel","Nasser","Samir","Ramadan","Essam","Emad","Magdy","Hany","Alaa","Waleed",
  "Basem","Ziad","Nour","Seif","Hazem","Moustafa","Ashraf","Karim","Ehab","Osama"
];
const femaleFirstNames = [
  "Nour","Sara","Mariam","Yasmin","Aya","Dina","Rania","Heba","Mona","Nada",
  "Hana","Layla","Farida","Salma","Rana","Amira","Doaa","Noha","Ghada","Mai",
  "Nadia","Sherine","Neveen","Eman","Reem","Lina","Sandy","Marina","Christine","Mary",
  "Menna","Yara","Zeinab","Fatma","Asmaa","Rabab","Shaimaa","Samira","Sahar","Wafaa",
  "Hoda","Nagwa","Nahla","Abeer","Nihal","Engy","Basma","Radwa","Reham","Amal"
];
const lastNames = [
  "Hassan","Mohamed","Ahmed","Ibrahim","Ali","Mahmoud","Omar","Khalil","Mansour","Salem",
  "Farouk","Nasser","Saad","Younes","Gaber","Lotfy","Sorour","Aziz","Amin","Kamel",
  "Fawzy","Helal","Sherif","Gohar","Wahba","Mostafa","Zaki","Badawy","Salama","Morsi",
  "Shahin","Abdo","Ragab","Saber","Attia","Rizk","Ghoneim","Barakat","Hamdy","Rashad",
  "Fathy","Tantawy","Shehata","Bishara","Mikhail","Girgis","Hanna","Botros","Samir","Nasr"
];

// ── Subscription plans ────────────────────────────────────────────────────────
const plans = [
  { months: 1, price: 450,  label: "Monthly"      },
  { months: 1, price: 450,  label: "Monthly"      },
  { months: 1, price: 450,  label: "Monthly"      },
  { months: 3, price: 1200, label: "Quarterly"    },
  { months: 3, price: 1200, label: "Quarterly"    },
  { months: 6, price: 2200, label: "Semi-Annual"  },
  { months: 12,price: 3800, label: "Annual"       },
  { months: 1, price: 350,  label: "Monthly (student)" },
  { months: 1, price: 600,  label: "Monthly (PT included)" },
  { months: 3, price: 1500, label: "Quarterly (PT included)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { return Date.now() - n * 86400000; }
function toUnixSec(ms) { return Math.floor(ms / 1000); }

function generatePhone() {
  const prefixes = ["010","011","012","015"];
  return rnd(prefixes) + String(rndInt(10000000, 99999999));
}

function chunk(items, size = CHUNK_SIZE) {
  const output = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

async function insertMembers(db, members) {
  for (const batch of chunk(members)) {
    await db.query(
      `INSERT INTO members (
          id, organization_id, branch_id, name, phone, gender, access_tier, card_code, created_at, updated_at
       )
       SELECT id, organization_id, branch_id, name, phone, gender, access_tier, card_code, created_at::timestamptz, created_at::timestamptz
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           id uuid,
           organization_id uuid,
           branch_id uuid,
           name text,
           phone text,
           gender text,
           access_tier text,
           card_code text,
           created_at text
         )`,
      [JSON.stringify(batch)]
    );
  }
}

async function insertSubscriptions(db, subscriptions) {
  const inserted = [];
  for (const batch of chunk(subscriptions)) {
    const result = await db.query(
      `INSERT INTO subscriptions (
          organization_id, branch_id, member_id, start_date, end_date, plan_months,
          price_paid, payment_method, sessions_per_month, is_active, created_at
       )
       SELECT organization_id, branch_id, member_id, start_date, end_date, plan_months,
              price_paid, payment_method, sessions_per_month, is_active, created_at::timestamptz
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           organization_id uuid,
           branch_id uuid,
           member_id uuid,
           start_date bigint,
           end_date bigint,
           plan_months integer,
           price_paid numeric,
           payment_method text,
           sessions_per_month integer,
           is_active boolean,
           created_at text
         )
      RETURNING id, member_id`,
      [JSON.stringify(batch)]
    );
    inserted.push(...result.rows);
  }
  return inserted;
}

async function insertFreezes(db, freezes) {
  if (freezes.length === 0) return;
  for (const batch of chunk(freezes)) {
    await db.query(
      `INSERT INTO subscription_freezes (
          organization_id, branch_id, subscription_id, start_date, end_date, days
       )
       SELECT organization_id, branch_id, subscription_id, start_date, end_date, days
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           organization_id uuid,
           branch_id uuid,
           subscription_id bigint,
           start_date bigint,
           end_date bigint,
           days integer
         )`,
      [JSON.stringify(batch)]
    );
  }
}

async function insertLogs(db, logs) {
  if (logs.length === 0) return;
  for (const batch of chunk(logs, 1000)) {
    await db.query(
      `INSERT INTO logs (
          organization_id, branch_id, member_id, scanned_value, method, timestamp,
          status, reason_code, operation_id, source, created_at
       )
       SELECT organization_id, branch_id, member_id, scanned_value, method, timestamp,
              status, reason_code, operation_id, source, created_at::timestamptz
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           organization_id uuid,
           branch_id uuid,
           member_id uuid,
           scanned_value text,
           method text,
           timestamp bigint,
           status text,
           reason_code text,
           operation_id uuid,
           source text,
           created_at text
         )`,
      [JSON.stringify(batch)]
    );
  }
}

// ── Member generation ─────────────────────────────────────────────────────────
function generateMembers(orgId, branchId, count) {
  const members = [];
  const usedPhones = new Set();

  for (let i = 0; i < count; i++) {
    const gender = Math.random() < 0.62 ? "male" : "female"; // 62% male, realistic for Egypt gyms
    const firstName = gender === "male" ? rnd(maleFirstNames) : rnd(femaleFirstNames);
    const lastName = rnd(lastNames);
    const name = `${firstName} ${lastName}`;

    let phone;
    do { phone = generatePhone(); } while (usedPhones.has(phone));
    usedPhones.add(phone);

    const accessTier = Math.random() < 0.1 ? "limited" : "full";
    const createdMsAgo = daysAgo(rndInt(30, 730)); // joined 1 month to 2 years ago

    members.push({
      id: uuidv4(),
      organization_id: orgId,
      branch_id: branchId,
      name,
      phone,
      gender,
      access_tier: accessTier,
      card_code: Math.random() < 0.7 ? String(1000 + i) : null, // 70% have card codes
      created_at: new Date(createdMsAgo).toISOString(),
    });
  }
  return members;
}

// ── Subscription generation ───────────────────────────────────────────────────
function generateSubscription(member, orgId, branchId) {
  const plan = rnd(plans);
  const rand = Math.random();

  let startMsAgo, statusType;
  if (rand < 0.55) {
    // 55% active — started within the last plan_months
    startMsAgo = rndInt(1, plan.months * 28) * 86400000;
    statusType = "active";
  } else if (rand < 0.75) {
    // 20% expiring soon (within 7 days)
    startMsAgo = (plan.months * 30 - rndInt(1, 7)) * 86400000;
    statusType = "expiring_soon";
  } else if (rand < 0.90) {
    // 15% expired (lapsed — the revenue leakage demo)
    startMsAgo = (plan.months * 30 + rndInt(5, 45)) * 86400000;
    statusType = "expired";
  } else {
    // 10% frozen
    startMsAgo = rndInt(15, 60) * 86400000;
    statusType = "frozen";
  }

  const startMs = Date.now() - startMsAgo;
  const endMs = startMs + plan.months * 30 * 86400000;

  // Slightly vary price paid (cash market — some pay less, some pay more)
  const pricePaid = plan.price + rndInt(-50, 100);

  return {
    id: undefined, // bigserial
    organization_id: orgId,
    branch_id: branchId,
    member_id: member.id,
    start_date: toUnixSec(startMs),
    end_date: toUnixSec(endMs),
    plan_months: plan.months,
    price_paid: pricePaid,
    payment_method: Math.random() < 0.68 ? "cash" : "digital",
    sessions_per_month: Math.random() < 0.3 ? rndInt(8, 20) : null,
    is_active: statusType !== "expired",
    created_at: new Date(startMs).toISOString(),
    statusType, // used to generate freeze record
  };
}

// ── Attendance log generation ─────────────────────────────────────────────────
function generateAttendanceLogs(member, sub, orgId, branchId) {
  const logs = [];
  if (sub.statusType === "expired") return logs; // expired members stopped coming

  // How many days ago their sub started
  const subStartMs = sub.start_date * 1000;
  const now = Date.now();
  const daysActive = Math.floor((now - subStartMs) / 86400000);
  if (daysActive <= 0) return logs;

  // Visit frequency: some are regulars, some are ghost members
  const visitFrequency = Math.random();
  let visitsPerMonth;
  if (visitFrequency < 0.25) visitsPerMonth = rndInt(1, 4);   // ghost member
  else if (visitFrequency < 0.6) visitsPerMonth = rndInt(8, 14); // regular
  else visitsPerMonth = rndInt(15, 24);                          // enthusiast

  const totalVisits = Math.floor((daysActive / 30) * visitsPerMonth);
  const usedDays = new Set();

  for (let v = 0; v < Math.min(totalVisits, 120); v++) {
    let dayOffset;
    do { dayOffset = rndInt(0, daysActive - 1); } while (usedDays.has(dayOffset));
    usedDays.add(dayOffset);

    const visitMs = subStartMs + dayOffset * 86400000 + rndInt(5, 22) * 3600000; // 5am–10pm
    if (visitMs > now) continue;

    logs.push({
      id: undefined,
      organization_id: orgId,
      branch_id: branchId,
      member_id: member.id,
      scanned_value: member.card_code || member.id,
      method: Math.random() < 0.85 ? "scan" : "manual",
      timestamp: toUnixSec(visitMs),
      status: "success",
      reason_code: "ok",
      operation_id: uuidv4(),
      source: "online",
      created_at: new Date(visitMs).toISOString(),
    });
  }

  // Add a few failed scans for realism
  if (Math.random() < 0.15) {
    const failMs = Date.now() - rndInt(1, 30) * 86400000;
    logs.push({
      id: undefined,
      organization_id: orgId,
      branch_id: branchId,
      member_id: member.id,
      scanned_value: member.card_code || member.id,
      method: "scan",
      timestamp: toUnixSec(failMs),
      status: "failure",
      reason_code: sub.statusType === "expiring_soon" ? "expired" : "not_found",
      operation_id: uuidv4(),
      source: "online",
      created_at: new Date(failMs).toISOString(),
    });
  }

  return logs;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 GymFlow Demo Seeder starting...\n");

  // 1. Create Firebase user
  console.log(`📧 Creating Firebase user: ${DEMO_EMAIL}`);
  let firebaseUid;
  try {
    const existing = await auth.getUserByEmail(DEMO_EMAIL);
    console.log(`   ⚠️  Firebase user already exists (${existing.uid}), using it.`);
    firebaseUid = existing.uid;
  } catch {
    const user = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: "GymFlow Demo",
    });
    firebaseUid = user.uid;
    console.log(`   ✅ Firebase user created: ${firebaseUid}`);
  }

  // 2. Connect to DB
  const db = new Client(DB_URL);
  await db.connect();
  console.log("✅ Connected to database\n");

  try {
    // 3. Check if org already exists
    const existingOwner = await db.query(
      `SELECT o.id, o.firebase_uid, oba.branch_id
         FROM owners o
         JOIN owner_branch_access oba ON oba.owner_id = o.id
        WHERE o.firebase_uid = $1 LIMIT 1`,
      [firebaseUid]
    );

    let orgId, branchId, ownerId;

    if (existingOwner.rows.length > 0) {
      console.log("⚠️  Owner already exists in DB. Fetching org/branch...");
      ownerId = existingOwner.rows[0].id;
      branchId = existingOwner.rows[0].branch_id;
      const branchRow = await db.query(`SELECT organization_id FROM branches WHERE id = $1`, [branchId]);
      orgId = branchRow.rows[0].organization_id;
      console.log(`   org: ${orgId} | branch: ${branchId}\n`);
    } else {
      // 4. Create org, branch, owner
      orgId = uuidv4();
      branchId = uuidv4();
      ownerId = uuidv4();

      await db.query(`INSERT INTO organizations (id, name) VALUES ($1, $2)`, [orgId, ORG_NAME]);
      await db.query(
        `INSERT INTO branches (id, organization_id, name, currency) VALUES ($1, $2, $3, 'EGP')`,
        [branchId, orgId, BRANCH_NAME]
      );
      await db.query(
        `INSERT INTO owners (id, firebase_uid, email, name) VALUES ($1, $2, $3, $4)`,
        [ownerId, firebaseUid, DEMO_EMAIL, "GymFlow Demo"]
      );
      await db.query(
        `INSERT INTO owner_branch_access (owner_id, branch_id, role) VALUES ($1, $2, 'owner')`,
        [ownerId, branchId]
      );
      console.log(`✅ Created org: ${ORG_NAME} | branch: ${BRANCH_NAME}\n`);
    }

    // 5. Clear existing demo data (idempotent re-runs)
    const existingMemberCount = await db.query(
      `SELECT COUNT(*) FROM members WHERE organization_id = $1`, [orgId]
    );
    if (parseInt(existingMemberCount.rows[0].count) > 0) {
      console.log("🧹 Clearing existing member data for fresh seed...");
      await db.query(`DELETE FROM logs WHERE organization_id = $1`, [orgId]);
      await db.query(`DELETE FROM subscription_freezes WHERE organization_id = $1`, [orgId]);
      await db.query(`DELETE FROM subscriptions WHERE organization_id = $1`, [orgId]);
      await db.query(`DELETE FROM members WHERE organization_id = $1`, [orgId]);
      console.log("   ✅ Cleared\n");
    }

    // 6. Generate + insert members
    console.log("👥 Generating 500 members...");
    const members = generateMembers(orgId, branchId, 500);
    await insertMembers(db, members);
    console.log(`   ✅ ${members.length} members inserted\n`);

    // 7. Generate + insert subscriptions
    console.log("📋 Generating subscriptions...");
    const subs = members.map((m) => generateSubscription(m, orgId, branchId));
    const insertedSubs = await insertSubscriptions(db, subs);
    const insertedByMemberId = new Map(insertedSubs.map((row) => [row.member_id, row.id]));
    for (const sub of subs) {
      sub.id = insertedByMemberId.get(sub.member_id);
    }

    const freezes = [];
    for (const sub of subs) {
      if (sub.statusType !== "frozen" || !sub.id) continue;
      const freezeStartSec = sub.start_date + rndInt(5, 15) * 86400;
      const freezeDays = rndInt(7, 21);
      freezes.push({
        organization_id: orgId,
        branch_id: branchId,
        subscription_id: sub.id,
        start_date: freezeStartSec,
        end_date: freezeStartSec + freezeDays * 86400,
        days: freezeDays,
      });
    }
    await insertFreezes(db, freezes);

    // Count by status
    const statusCounts = subs.reduce((acc, s) => {
      acc[s.statusType] = (acc[s.statusType] || 0) + 1;
      return acc;
    }, {});
    console.log(`   ✅ ${subs.length} subscriptions inserted`);
    console.log(`   📊 Active: ${statusCounts.active || 0} | Expiring soon: ${statusCounts.expiring_soon || 0} | Expired: ${statusCounts.expired || 0} | Frozen: ${statusCounts.frozen || 0}\n`);

    // 8. Generate + insert attendance logs
    console.log("📅 Generating attendance logs (this takes a moment)...");
    const allLogs = [];
    for (let i = 0; i < members.length; i++) {
      const logs = generateAttendanceLogs(members[i], subs[i], orgId, branchId);
      allLogs.push(...logs);
    }
    await insertLogs(db, allLogs);
    const totalLogs = allLogs.length;
    console.log(`   ✅ ${totalLogs} attendance logs inserted\n`);

    // 9. Summary
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ DEMO ACCOUNT READY");
    console.log("═══════════════════════════════════════════════════");
    console.log(`📧 Email:     ${DEMO_EMAIL}`);
    console.log(`🔑 Password:  ${DEMO_PASSWORD}`);
    console.log(`🏢 Gym:       ${ORG_NAME} — ${BRANCH_NAME}`);
    console.log(`👥 Members:   500`);
    console.log(`   Active:    ${statusCounts.active || 0}`);
    console.log(`   Expiring:  ${statusCounts.expiring_soon || 0} (within 7 days)`);
    console.log(`   Expired:   ${statusCounts.expired || 0} (revenue leakage demo)`);
    console.log(`   Frozen:    ${statusCounts.frozen || 0}`);
    console.log(`📅 Logs:      ${totalLogs} check-ins`);
    console.log("═══════════════════════════════════════════════════\n");

  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error("❌ Seeder failed:", err.message);
  process.exit(1);
});

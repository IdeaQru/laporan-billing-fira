// ============================================================
// Infrastructure: SQLite Database Connection & Path Resolver
// Supports Local Dev & Vercel / AWS Lambda Serverless Deployments
// ============================================================
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dynamically resolves the database path across environments.
 * In serverless environments (Vercel), copies DB to OS temp dir if read-only.
 * @returns {string}
 */
export function resolveDbPath() {
  if (process.env.DB_PATH && fs.existsSync(process.env.DB_PATH)) {
    return process.env.DB_PATH;
  }

  const rootDir = join(__dirname, '..', '..', '..');
  const candidates = [
    join(process.cwd(), 'data', 'wifi_billing.db'),
    join(rootDir, 'data', 'wifi_billing.db'),
    join(process.cwd(), 'laporanwifi', 'data', 'wifi_billing.db'),
    join('/var/task', 'data', 'wifi_billing.db'),
  ];

  const foundSource = candidates.find((p) => fs.existsSync(p));

  // Handle serverless / Vercel environment where /var/task is read-only
  const isServerless = Boolean(
    process.env.VERCEL === '1' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NOW_REGION
  );

  if (isServerless) {
    const tmpDir = os.tmpdir();
    const tmpDbPath = join(tmpDir, 'wifi_billing.db');
    if (foundSource) {
      try {
        if (!fs.existsSync(tmpDbPath)) {
          fs.copyFileSync(foundSource, tmpDbPath);
          if (fs.existsSync(foundSource + '-wal')) {
            fs.copyFileSync(foundSource + '-wal', tmpDbPath + '-wal');
          }
          if (fs.existsSync(foundSource + '-shm')) {
            fs.copyFileSync(foundSource + '-shm', tmpDbPath + '-shm');
          }
        }
        return tmpDbPath;
      } catch (err) {
        console.warn('⚠️ Warning: Failed copying DB to temp dir, falling back to foundSource:', err);
      }
    }
  }

  if (foundSource) {
    return foundSource;
  }

  // Fallback: Ensure parent directory exists
  const defaultPath = join(rootDir, 'data', 'wifi_billing.db');
  const defaultDir = dirname(defaultPath);
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultPath;
}

/** @returns {import('better-sqlite3').Database} */
export function getDatabase() {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath, { readonly: false });
  try {
    db.pragma('journal_mode = WAL');
  } catch (e) {
    // Ignore WAL mode failure if filesystem restricts pragma modifications
  }
  try {
    db.pragma('foreign_keys = ON');
  } catch (e) {
    // Ignore
  }
  return db;
}

/** @returns {import('better-sqlite3').Database} */
export function getReadonlyDatabase() {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath, { readonly: true });
  try {
    db.pragma('journal_mode = WAL');
  } catch (e) {
    // Ignore WAL pragma error on readonly connection
  }
  return db;
}


// ============================================================
// Domain Types — Branded / Opaque Types & Result Pattern
// ============================================================

/**
 * @template T
 * @template {string} Brand
 * @typedef {T & { readonly __brand: Brand }} Branded
 */

/**
 * @template T
 * @template E
 * @typedef {{ ok: true, value: T } | { ok: false, error: E }} Result
 */

/** @param {T} value @returns {{ ok: true, value: T }} @template T */
export const Ok = (value) => ({ ok: true, value });

/** @param {E} error @returns {{ ok: false, error: E }} @template E */
export const Err = (error) => ({ ok: false, error });

/**
 * Pipeline helper — chains Result-returning functions.
 * @template T, U, E
 * @param {Result<T, E>} result
 * @param {(value: T) => Result<U, E>} fn
 * @returns {Result<U, E>}
 */
export const andThen = (result, fn) =>
  result.ok ? fn(result.value) : result;

/**
 * Map over a successful Result value.
 * @template T, U, E
 * @param {Result<T, E>} result
 * @param {(value: T) => U} fn
 * @returns {Result<U, E>}
 */
export const map = (result, fn) =>
  result.ok ? Ok(fn(result.value)) : result;

/**
 * Pipe: compose multiple functions in a pipeline.
 * @param {any} initial
 * @param {...Function} fns
 * @returns {any}
 */
export const pipe = (initial, ...fns) =>
  fns.reduce((acc, fn) => fn(acc), initial);

// -- Branded type constructors (validation at creation time) --

/** @param {string} raw @returns {Result<Branded<string, 'CustomerId'>, string>} */
export const CustomerId = (raw) => {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0)
    return Err('CustomerId tidak boleh kosong');
  return Ok(/** @type {Branded<string, 'CustomerId'>} */ (raw.trim().toUpperCase()));
};

/** @param {number} raw @returns {Result<Branded<number, 'Money'>, string>} */
export const Money = (raw) => {
  if (typeof raw !== 'number' || isNaN(raw) || raw < 0)
    return Err(`Nilai money tidak valid: ${raw}`);
  return Ok(/** @type {Branded<number, 'Money'>} */ (Math.round(raw)));
};

/** @param {string} raw @returns {Result<Branded<string, 'AreaCode'>, string>} */
export const AreaCode = (raw) => {
  if (!raw || typeof raw !== 'string')
    return Err('AreaCode tidak boleh kosong');
  return Ok(/** @type {Branded<string, 'AreaCode'>} */ (raw.trim().toUpperCase()));
};

/** @param {string} raw @returns {Result<Branded<string, 'BillingPeriod'>, string>} */
export const BillingPeriod = (raw) => {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw))
    return Err(`Format billing period tidak valid: ${raw}. Expected YYYY-MM`);
  return Ok(/** @type {Branded<string, 'BillingPeriod'>} */ (raw));
};

// -- Payment method enum (exhaustive) --

/** @type {readonly ['CASH', 'BCA', 'BRI', 'MANDIRI', 'BNI']} */
export const PAYMENT_METHODS = Object.freeze(['CASH', 'BCA', 'BRI', 'MANDIRI', 'BNI']);

/** @param {string} raw @returns {Result<string, string>} */
export const PaymentMethod = (raw) => {
  const upper = (raw || '').trim().toUpperCase();
  if (PAYMENT_METHODS.includes(/** @type {any} */ (upper))) return Ok(upper);
  return Err(`Metode pembayaran tidak valid: ${raw}`);
};

// -- Invoice Status enum (exhaustive) --

/** @type {readonly ['LUNAS', 'BELUM LUNAS', 'ISOLIR', 'PROSES']} */
export const INVOICE_STATUSES = Object.freeze(['LUNAS', 'BELUM LUNAS', 'ISOLIR', 'PROSES']);

/** @param {string} raw @returns {string} */
export const normalizeInvoiceStatus = (raw) => {
  if (!raw) return 'BELUM LUNAS';
  const upper = raw.trim().toUpperCase();
  if (upper === 'LUNAS' || upper.includes('LUNAS')) return 'LUNAS';
  if (upper === 'ISOLIR' || upper.includes('ISOLIR')) return 'ISOLIR';
  if (upper === 'PROSES' || upper.includes('PROSES')) return 'PROSES';
  return 'BELUM LUNAS';
};

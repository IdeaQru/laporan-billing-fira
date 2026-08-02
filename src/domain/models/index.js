// ============================================================
// Domain Models — Immutable Data Structures
// ============================================================

/**
 * @typedef {Readonly<{
 *   id: number,
 *   code: number,
 *   speedName: string,
 *   price: number
 * }>} Package
 */

/**
 * @typedef {Readonly<{
 *   id: number,
 *   code: string,
 *   name: string,
 *   sourceFile: string | null
 * }>} Area
 */

/**
 * @typedef {Readonly<{
 *   id: number,
 *   customerCode: string,
 *   name: string,
 *   areaId: number,
 *   areaName: string,
 *   areaCode: string,
 *   packageId: number | null,
 *   packageName: string | null,
 *   packagePrice: number | null
 * }>} Customer
 */

/**
 * @typedef {Readonly<{
 *   id: number,
 *   customerId: number,
 *   customerCode: string,
 *   customerName: string,
 *   areaName: string,
 *   billingPeriod: string,
 *   amount: number,
 *   status: string,
 *   unpaidAmount: number,
 *   unpaidMonths: number,
 *   notes: string | null
 * }>} Invoice
 */

/**
 * @typedef {Readonly<{
 *   id: number,
 *   invoiceId: number,
 *   paymentMethod: string,
 *   amountPaid: number,
 *   paymentDate: string | null,
 *   notes: string | null
 * }>} Payment
 */

/**
 * @typedef {Readonly<{
 *   id: number,
 *   expenseDate: string,
 *   description: string,
 *   amount: number,
 *   category: string
 * }>} Expense
 */

/**
 * @typedef {Readonly<{
 *   totalCustomers: number,
 *   totalActiveCustomers: number,
 *   totalRevenuePaid: number,
 *   totalOutstanding: number,
 *   totalExpenses: number,
 *   netBalance: number,
 *   paymentBreakdown: ReadonlyArray<{ method: string, total: number, percentage: number }>,
 *   areaBreakdown: ReadonlyArray<{ areaName: string, totalCustomers: number, totalPaid: number, totalUnpaid: number, collectionRate: number }>,
 *   collectionEfficiency: number,
 *   highestUnpaidArea: string,
 *   lowestUnpaidArea: string,
 *   detailNarrative: string
 * }>} ExecutiveSummary
 */

export const Models = {
  /** @param {Partial<Package>} data @returns {Package} */
  createPackage: (data) => Object.freeze({ ...data }),

  /** @param {Partial<Area>} data @returns {Area} */
  createArea: (data) => Object.freeze({ ...data }),

  /** @param {Partial<Customer>} data @returns {Customer} */
  createCustomer: (data) => Object.freeze({ ...data }),

  /** @param {Partial<Invoice>} data @returns {Invoice} */
  createInvoice: (data) => Object.freeze({ ...data }),

  /** @param {Partial<Expense>} data @returns {Expense} */
  createExpense: (data) => Object.freeze({ ...data }),
};

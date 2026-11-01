const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Project data locations
const DATA_DIR = path.resolve(__dirname, "../../../data");
const GENERATED_DIR = path.join(DATA_DIR, "v2_staging");
const ORIGINAL_DIR = path.join(DATA_DIR, "generated");
const MASTER_DATA_DIR = path.join(DATA_DIR, "exports");

const MASTER_DATA_PATH = path.join(MASTER_DATA_DIR, "master_data.json");
const REPORT_PATH = path.join(GENERATED_DIR, "validation_report.json");

// Expected record counts
const EXPECTED = {
  users: 1000,
  categories: 12,
  merchants: 12,
  transactions: 500000,
  budgets: 108000,
  recurringSeries: 4000
};

// Parse CSV safely, including quoted values
function parseCsvLine(line) {
  const result = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  result.push(value);
  return result;
}

// Read CSV one row at a time
async function readCsv(fileName, callback, directory = GENERATED_DIR) {
  const filePath = path.join(directory, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing CSV file: ${filePath}`);
  }

  const input = fs.createReadStream(filePath);

  const reader = readline.createInterface({
    input,
    crlfDelay: Infinity
  });

  let headers = null;
  let rowCount = 0;

  for await (const line of reader) {
    if (!line.trim()) continue;

    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    rowCount++;
    await callback(row);
  }

  return rowCount;
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

async function validate() {
  const errors = [];

  const report = {
    project: "SpendWise",
    validationDate: new Date().toISOString(),
    validationStatus: "RUNNING"
  };

  console.log("\n========== SPENDWISE DATA VALIDATION ==========\n");

  // Check directories
  if (!fs.existsSync(GENERATED_DIR)) {
    throw new Error(`Generated directory not found: ${GENERATED_DIR}`);
  }

  if (!fs.existsSync(MASTER_DATA_DIR)) {
    throw new Error(`Exports directory not found: ${MASTER_DATA_DIR}`);
  }

  // 1. Load master data
  console.log("1. Loading master data...");

  console.log("Master data path:", MASTER_DATA_PATH);
  console.log("Master data exists:", fs.existsSync(MASTER_DATA_PATH));

  if (!fs.existsSync(MASTER_DATA_PATH)) {
    throw new Error(
      `master_data.json is missing. Expected location: ${MASTER_DATA_PATH}`
    );
  }

  const master = JSON.parse(
    fs.readFileSync(MASTER_DATA_PATH, "utf8")
  );

  if (
    !Array.isArray(master.users) ||
    !Array.isArray(master.accounts) ||
    !Array.isArray(master.merchants) ||
    !Array.isArray(master.categories)
  ) {
    throw new Error(
      "master_data.json must contain users, accounts, merchants and categories arrays."
    );
  }

  const users = new Set(master.users.map(x => x.userId));
  const accounts = new Set(master.accounts.map(x => x.accountId));
  const merchants = new Set(master.merchants.map(x => x.merchantId));
  const categories = new Set(master.categories.map(x => x.categoryId));

  report.masterData = {
    users: users.size,
    accounts: accounts.size,
    merchants: merchants.size,
    categories: categories.size
  };

  assert(
    users.size === EXPECTED.users,
    `Expected ${EXPECTED.users} users, found ${users.size}`,
    errors
  );

  assert(
    categories.size === EXPECTED.categories,
    `Expected ${EXPECTED.categories} categories, found ${categories.size}`,
    errors
  );

  assert(
    merchants.size === EXPECTED.merchants,
    `Expected ${EXPECTED.merchants} merchants, found ${merchants.size}`,
    errors
  );

  // 2. Validate master data relationships
  console.log("\n2. Validating master data relationships...");

  let invalidAccountReferences = 0;

  for (const account of master.accounts) {
    if (!users.has(account.userId)) {
      invalidAccountReferences++;
    }
  }

  report.invalidAccountReferences = invalidAccountReferences;

  assert(
    invalidAccountReferences === 0,
    `${invalidAccountReferences} accounts have invalid user references`,
    errors
  );

  // 3. Validate transactions
  console.log("\n3. Validating transactions (500,000 rows)...");

  const transactionIds = new Set();
  const transactionsById = new Map();
  const transferGroups = new Map();
  let refundCount = 0;

  let transactionCount = 0;
  let invalidTransactionReferences = 0;
  let invalidAmounts = 0;
  let invalidDates = 0;
  let invalidTypes = 0;
  let invalidStatuses = 0;

  const allowedTypes = new Set([
    "INCOME",
    "EXPENSE",
    "TRANSFER",
    "REFUND"
  ]);

  const allowedStatuses = new Set([
    "COMPLETED",
    "PENDING",
    "FAILED",
    "REVERSED"
  ]);

  await readCsv("transactions_v2.csv", row => {
    transactionCount++;

    // Primary key check
    if (!row.transactionId) {
      invalidTransactionReferences++;
    } else if (transactionIds.has(row.transactionId)) {
      errors.push(`Duplicate transaction ID: ${row.transactionId}`);
    } else {
      transactionIds.add(row.transactionId);
    }

    // Foreign key checks
    if (
      !users.has(row.userId) ||
      !accounts.has(row.accountId) ||
      !categories.has(row.categoryId) ||
      (row.merchantId && !merchants.has(row.merchantId))
    ) {
      invalidTransactionReferences++;
    }

    // Amount check
    const amount = Number(row.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      invalidAmounts++;
    }

    // Date check
    if (
      !row.transactionDate ||
      Number.isNaN(Date.parse(row.transactionDate))
    ) {
      invalidDates++;
    }

    // Transaction type check
    if (!allowedTypes.has(row.transactionType)) {
      invalidTypes++;
    }

    // Status check
    if (!allowedStatuses.has(row.status)) {
      invalidStatuses++;
    }

    // Store transaction details for relationship validation
    transactionsById.set(row.transactionId, {
      userId: row.userId,
      merchantId: row.merchantId,
      accountId: row.accountId,
      categoryId: row.categoryId,
      transactionDate: row.transactionDate,
      transactionType: row.transactionType,
      amount: Number(row.amount),
      status: row.status,
      relatedTransactionId: row.relatedTransactionId,
      transferGroupId: row.transferGroupId,
      counterpartyAccountId: row.counterpartyAccountId,
      transferDirection: row.transferDirection,
      recurringId: row.recurringId
    });

    // Group transfer transactions
    if (row.transactionType === "TRANSFER" && row.transferGroupId) {
      if (!transferGroups.has(row.transferGroupId)) {
        transferGroups.set(row.transferGroupId, []);
      }

      transferGroups.get(row.transferGroupId).push(row.transactionId);
    }

    // Count refund transactions
    if (row.transactionType === "REFUND") {
      refundCount++;
    }
  });

  // Validate transfer pairs
  let invalidTransferGroups = 0;

  for (const [groupId, transactionIds] of transferGroups) {
    const group = transactionIds
      .map(id => transactionsById.get(id))
      .filter(Boolean);

    const outgoing = group.find(
      transaction => transaction.transferDirection === "OUT"
    );

    const incoming = group.find(
      transaction => transaction.transferDirection === "IN"
    );

    const validPair =
      group.length === 2 &&
      outgoing &&
      incoming &&
      outgoing.userId === incoming.userId &&
      outgoing.accountId !== incoming.accountId &&
      outgoing.categoryId === incoming.categoryId &&
      Math.round(outgoing.amount * 100) ===
        Math.round(incoming.amount * 100) &&
      outgoing.status === "COMPLETED" &&
      incoming.status === "COMPLETED" &&
      outgoing.transactionDate === incoming.transactionDate &&
      outgoing.counterpartyAccountId === incoming.accountId &&
      incoming.counterpartyAccountId === outgoing.accountId;

    if (!validPair) {
      invalidTransferGroups++;
      errors.push(`Invalid transfer group: ${groupId}`);
    }
  }

  report.transferPairs = {
    totalGroups: transferGroups.size,
    invalidGroups: invalidTransferGroups,
    validatedGroups: transferGroups.size - invalidTransferGroups
  };

  // Validate refund relationships
  let invalidRefunds = 0;
  const refundedAmounts = new Map();

  for (const [transactionId, refund] of transactionsById) {
    if (refund.transactionType !== "REFUND") {
      continue;
    }

    const original = transactionsById.get(refund.relatedTransactionId);

    const validRefund =
      original &&
      original.transactionType === "EXPENSE" &&
      original.status === "COMPLETED" &&
      original.userId === refund.userId &&
      original.accountId === refund.accountId &&
      refund.amount > 0 &&
      new Date(refund.transactionDate).getTime() >=
        new Date(original.transactionDate).getTime();

    if (!validRefund) {
      invalidRefunds++;
      errors.push(`Invalid refund relationship: ${transactionId}`);
      continue;
    }

    const refundTotal =
      (refundedAmounts.get(refund.relatedTransactionId) || 0) +
      Math.round(refund.amount * 100);

    refundedAmounts.set(refund.relatedTransactionId, refundTotal);

    if (refundTotal > Math.round(original.amount * 100)) {
      invalidRefunds++;
      errors.push(`Refund amount exceeds original expense: ${transactionId}`);
    }
  }

  report.refunds = {
    totalRefunds: refundCount,
    invalidRefunds,
    validatedRefunds: refundCount - invalidRefunds
  };

  // 6. Independent account balance reconciliation
  console.log("\n6. Validating account balance reconciliation...");

  const accountBalances = new Map();

  let invalidAccountBalances = 0;
  let accountBalanceMismatches = 0;

  // Load account opening and closing balances
  await readCsv("accounts_v2.csv", row => {
    const openingBalance = Number(row.openingBalance);
    const closingBalance = Number(row.balance);

    if (
      !Number.isFinite(openingBalance) ||
      !Number.isFinite(closingBalance)
    ) {
      invalidAccountBalances++;
      errors.push(`Invalid account balance: ${row.accountId}`);
      return;
    }

    accountBalances.set(row.accountId, {
      userId: row.userId,
      openingCents: Math.round(openingBalance * 100),
      closingCents: Math.round(closingBalance * 100),
      calculatedCents: Math.round(openingBalance * 100)
    });
  });

  // Apply completed transactions to account balances
  for (const [transactionId, transaction] of transactionsById) {
    if (transaction.status !== "COMPLETED") {
      continue;
    }

    const account = accountBalances.get(transaction.accountId);

    if (!account || account.userId !== transaction.userId) {
      invalidAccountBalances++;
      errors.push(`Invalid account ownership: ${transactionId}`);
      continue;
    }

    const amountCents = Math.round(transaction.amount * 100);

    switch (transaction.transactionType) {
      case "INCOME":
      case "REFUND":
        account.calculatedCents += amountCents;
        break;

      case "EXPENSE":
        account.calculatedCents -= amountCents;
        break;

      case "TRANSFER":
        if (transaction.transferDirection === "OUT") {
          account.calculatedCents -= amountCents;
        } else if (transaction.transferDirection === "IN") {
          account.calculatedCents += amountCents;
        } else {
          invalidAccountBalances++;
          errors.push(`Invalid transfer direction: ${transactionId}`);
        }
        break;
    }
  }

  // Compare calculated balances with exported closing balances
  for (const [accountId, account] of accountBalances) {
    if (account.calculatedCents !== account.closingCents) {
      accountBalanceMismatches++;

      errors.push(
        `Account balance mismatch: ${accountId} | Expected: ${(account.calculatedCents / 100).toFixed(2)} | Actual: ${(account.closingCents / 100).toFixed(2)}`
      );
    }
  }

  report.accountReconciliation = {
    totalAccounts: accountBalances.size,
    invalidAccounts: invalidAccountBalances,
    mismatchedAccounts: accountBalanceMismatches,
    reconciledAccounts:
      accountBalances.size - accountBalanceMismatches - invalidAccountBalances
  };

  assert(
    accountBalances.size === 2028,
    `Expected 2028 accounts, found ${accountBalances.size}`,
    errors
  );

  assert(
    invalidAccountBalances === 0,
    "Invalid account balances or ownership found",
    errors
  );

  assert(
    accountBalanceMismatches === 0,
    "Account balance reconciliation failed",
    errors
  );

  report.transactions = {
    total: transactionCount,
    duplicateOrMissingIds: transactionCount - transactionIds.size,
    invalidReferences: invalidTransactionReferences,
    invalidAmounts,
    invalidDates,
    invalidTypes,
    invalidStatuses
  };

  assert(
    transactionCount === EXPECTED.transactions,
    `Expected ${EXPECTED.transactions} transactions, found ${transactionCount}`,
    errors
  );

  assert(
    invalidTransactionReferences === 0,
    "Invalid transaction IDs or foreign-key references found",
    errors
  );

  assert(invalidAmounts === 0, "Invalid transaction amounts found", errors);
  assert(invalidDates === 0, "Invalid transaction dates found", errors);
  assert(invalidTypes === 0, "Invalid transaction types found", errors);
  assert(invalidStatuses === 0, "Invalid transaction statuses found", errors);
    // 4. Validate budgets
  console.log("\n4. Validating budgets...");

  const budgetIds = new Set();

  let budgetCount = 0;
  let duplicateBudgetIds = 0;
  let invalidBudgets = 0;

  await readCsv("budgets_v2.csv", row => {
    budgetCount++;

    if (!row.budgetId || budgetIds.has(row.budgetId)) {
      duplicateBudgetIds++;
    } else {
      budgetIds.add(row.budgetId);
    }

    if (!users.has(row.userId) || !categories.has(row.categoryId)) {
      invalidBudgets++;
    }

    const amount = Number(row.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      invalidBudgets++;
    }

    const year = Number(row.year);
    const month = Number(row.month);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      invalidBudgets++;
    }
  });

  report.budgets = {
    total: budgetCount,
    duplicateIds: duplicateBudgetIds,
    invalidRecords: invalidBudgets
  };

  assert(
    budgetCount === EXPECTED.budgets,
    `Expected ${EXPECTED.budgets} budgets, found ${budgetCount}`,
    errors
  );

  assert(duplicateBudgetIds === 0, "Duplicate budget IDs found", errors);
  assert(invalidBudgets === 0, "Invalid budget records found", errors);

  // 5. Validate recurring series
  console.log("\n5. Validating recurring series...");

  const recurringIds = new Set();
  const recurringSeriesById = new Map();

  let recurringCount = 0;
  let duplicateRecurringIds = 0;
  let invalidRecurring = 0;

  const allowedFrequencies = new Set([
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "YEARLY"
  ]);

  const allowedRecurringStatuses = new Set([
    "ACTIVE",
    "PAUSED",
    "CANCELLED",
    "COMPLETED"
  ]);

  await readCsv("recurring_series.csv", row => {
    recurringCount++;

    if (!row.recurringId || recurringIds.has(row.recurringId)) {
      duplicateRecurringIds++;
    } else {
      recurringIds.add(row.recurringId);
    }

    // Store recurring series details for transaction validation
    recurringSeriesById.set(row.recurringId, {
      userId: row.userId,
      merchantId: row.merchantId,
      categoryId: row.categoryId,
      expectedAmount: Number(row.expectedAmount),
      frequency: row.frequency,
      status: row.status
    });

    if (
      !users.has(row.userId) ||
      !merchants.has(row.merchantId) ||
      !categories.has(row.categoryId)
    ) {
      invalidRecurring++;
    }

    const amount = Number(row.expectedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      invalidRecurring++;
    }

    if (!allowedFrequencies.has(row.frequency)) {
      invalidRecurring++;
    }

    if (!allowedRecurringStatuses.has(row.status)) {
      invalidRecurring++;
    }

    if (
      Number.isNaN(Date.parse(row.startDate)) ||
      Number.isNaN(Date.parse(row.nextExpectedDate))
    ) {
      invalidRecurring++;
    }
  }, ORIGINAL_DIR);

  // Validate recurring transactions
  let recurringTransactionCount = 0;
  let invalidRecurringTransactions = 0;

  for (const [transactionId, transaction] of transactionsById) {
    if (!transaction.recurringId) {
      continue;
    }

    recurringTransactionCount++;

    const series = recurringSeriesById.get(transaction.recurringId);

    const validRecurringTransaction =
      series &&
      series.status === "ACTIVE" &&
      transaction.userId === series.userId &&
      transaction.merchantId === series.merchantId &&
      transaction.categoryId === series.categoryId &&
      transaction.transactionType === "EXPENSE" &&
      transaction.status === "COMPLETED" &&
      Math.round(transaction.amount * 100) ===
        Math.round(series.expectedAmount * 100);

    if (!validRecurringTransaction) {
      invalidRecurringTransactions++;
      errors.push(`Invalid recurring transaction: ${transactionId}`);
    }
  }

  report.recurringTransactions = {
    total: recurringTransactionCount,
    invalid: invalidRecurringTransactions,
    validated: recurringTransactionCount - invalidRecurringTransactions
  };

  assert(
    recurringTransactionCount === 48000,
    `Expected 48000 recurring transactions, found ${recurringTransactionCount}`,
    errors
  );

  assert(
    invalidRecurringTransactions === 0,
    "Invalid recurring transactions found",
    errors
  );

  report.recurringSeries = {
    total: recurringCount,
    duplicateIds: duplicateRecurringIds,
    invalidRecords: invalidRecurring
  };

  assert(
    recurringCount === EXPECTED.recurringSeries,
    `Expected ${EXPECTED.recurringSeries} recurring series, found ${recurringCount}`,
    errors
  );

  assert(
    duplicateRecurringIds === 0,
    "Duplicate recurring IDs found",
    errors
  );

  assert(
    invalidRecurring === 0,
    "Invalid recurring records found",
    errors
  );

  // 7. Validate anomaly cases
  console.log("\n7. Validating anomaly cases...");

  const anomalyCases = new Map();
  let anomalyCaseCount = 0;
  let invalidAnomalyCases = 0;

  await readCsv("anomaly_cases.csv", row => {
    anomalyCaseCount++;

    if (!row.anomalyId || anomalyCases.has(row.anomalyId)) {
      invalidAnomalyCases++;
      errors.push(`Duplicate or missing anomaly ID: ${row.anomalyId}`);
      return;
    }

    anomalyCases.set(row.anomalyId, {
      anomalyType: row.anomalyType,
      transactionId: row.transactionId,
      recurringId: row.recurringId,
      categoryId: row.categoryId,
      expectedOutcome: row.expectedOutcome
    });

    if (!row.anomalyType || !row.expectedOutcome) {
      invalidAnomalyCases++;
      errors.push(`Incomplete anomaly case: ${row.anomalyId}`);
    }
  });

  report.anomalyCases = {
    total: anomalyCaseCount,
    invalid: invalidAnomalyCases
  };

  assert(
    anomalyCaseCount === 5,
    `Expected 5 anomaly cases, found ${anomalyCaseCount}`,
    errors
  );

  assert(
    invalidAnomalyCases === 0,
    "Invalid anomaly cases found",
    errors
  );

  // 8. Validate anomaly transaction fixtures
  console.log("\n8. Validating anomaly transaction fixtures...");

  const anomalyFixtureIds = new Set();
  let anomalyFixtureCount = 0;
  let invalidAnomalyFixtures = 0;

  await readCsv("anomaly_transactions.csv", row => {
    anomalyFixtureCount++;

    if (!row.transactionId || anomalyFixtureIds.has(row.transactionId)) {
      invalidAnomalyFixtures++;
      errors.push(`Duplicate or missing anomaly fixture ID: ${row.transactionId}`);
      return;
    }

    anomalyFixtureIds.add(row.transactionId);

    if (
      row.isAnomaly !== "true" ||
      !row.anomalyType ||
      !anomalyCases.size
    ) {
      invalidAnomalyFixtures++;
      errors.push(`Invalid anomaly fixture flags: ${row.transactionId}`);
    }

    if (
      !users.has(row.userId) ||
      !accounts.has(row.accountId) ||
      !categories.has(row.categoryId) ||
      (row.merchantId && !merchants.has(row.merchantId))
    ) {
      invalidAnomalyFixtures++;
      errors.push(`Invalid anomaly fixture references: ${row.transactionId}`);
    }

    const amount = Number(row.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      invalidAnomalyFixtures++;
      errors.push(`Invalid anomaly fixture amount: ${row.transactionId}`);
    }

    const matchingCase = [...anomalyCases.values()].find(
      item => item.transactionId === row.transactionId
    );

    if (
      !matchingCase ||
      matchingCase.anomalyType !== row.anomalyType
    ) {
      invalidAnomalyFixtures++;
      errors.push(`Anomaly fixture does not match anomaly case: ${row.transactionId}`);
    }
  });

  report.anomalyTransactionFixtures = {
    total: anomalyFixtureCount,
    invalid: invalidAnomalyFixtures
  };

  assert(
    anomalyFixtureCount === 3,
    `Expected 3 anomaly transaction fixtures, found ${anomalyFixtureCount}`,
    errors
  );

  assert(
    invalidAnomalyFixtures === 0,
    "Invalid anomaly transaction fixtures found",
    errors
  );

  // 9. Validate invalid budget category fixtures
  console.log("\n9. Validating invalid budget category fixtures...");

  let invalidBudgetFixtureCount = 0;
  let invalidBudgetFixtureErrors = 0;

  await readCsv("invalid_budget_cases.csv", row => {
    invalidBudgetFixtureCount++;

    const amount = Number(row.amount);

    const validFixture =
      Boolean(row.budgetId) &&
      users.has(row.userId) &&
      !categories.has(row.categoryId) &&
      Number.isFinite(amount) &&
      amount > 0 &&
      row.isAnomaly === "true" &&
      row.anomalyType === "INVALID_BUDGET_CATEGORY";

    if (!validFixture) {
      invalidBudgetFixtureErrors++;
      errors.push(`Invalid budget anomaly fixture: ${row.budgetId}`);
    }
  });

  report.invalidBudgetFixtures = {
    total: invalidBudgetFixtureCount,
    invalid: invalidBudgetFixtureErrors
  };

  assert(
    invalidBudgetFixtureCount === 1,
    `Expected 1 invalid budget fixture, found ${invalidBudgetFixtureCount}`,
    errors
  );

  assert(
    invalidBudgetFixtureErrors === 0,
    "Invalid budget category fixtures found",
    errors
  );
    // 10. Validate ground truth
  console.log("\n10. Validating ground truth...");

  const GROUND_TRUTH_PATH = path.join(
    GENERATED_DIR,
    "ground_truth",
    "ground_truth.json"
  );

  let groundTruthCount = 0;
  let invalidGroundTruth = 0;

  if (!fs.existsSync(GROUND_TRUTH_PATH)) {
    throw new Error(`Ground truth file not found: ${GROUND_TRUTH_PATH}`);
  }

  const groundTruth = JSON.parse(
    fs.readFileSync(GROUND_TRUTH_PATH, "utf8")
  );

  if (!Array.isArray(groundTruth)) {
    throw new Error("ground_truth.json must contain an array.");
  }

  groundTruthCount = groundTruth.length;

  for (const item of groundTruth) {
    const anomalyCase = anomalyCases.get(item.anomalyId);

    const validGroundTruth =
      anomalyCase &&
      anomalyCase.anomalyType === item.anomalyType &&
      anomalyCase.expectedOutcome === item.expectedOutcome;

    if (!validGroundTruth) {
      invalidGroundTruth++;
      errors.push(`Ground truth mismatch: ${item.anomalyId}`);
      continue;
    }

    if (
      item.affectedTransactionId &&
      !transactionsById.has(item.affectedTransactionId)
    ) {
      invalidGroundTruth++;
      errors.push(
        `Ground truth references missing transaction: ${item.affectedTransactionId}`
      );
    }

    if (
      item.recurringId &&
      !recurringIds.has(item.recurringId)
    ) {
      invalidGroundTruth++;
      errors.push(
        `Ground truth references missing recurring series: ${item.recurringId}`
      );
    }
  }

  report.groundTruth = {
    total: groundTruthCount,
    invalid: invalidGroundTruth
  };

  assert(
    groundTruthCount === 5,
    `Expected 5 ground truth cases, found ${groundTruthCount}`,
    errors
  );

  assert(
    invalidGroundTruth === 0,
    "Invalid ground truth records found",
    errors
  );

  // 11. Validate skipped recurring payments
  console.log("\n11. Validating skipped recurring payments...");

  let skippedPaymentCount = 0;
  let invalidSkippedPayments = 0;

  await readCsv("skipped_payments.csv", row => {
    skippedPaymentCount++;

    const amount = Number(row.expectedAmount);
    const validSkippedPayment =
      recurringIds.has(row.recurringId) &&
      users.has(row.userId) &&
      Number.isFinite(amount) &&
      amount > 0 &&
      !Number.isNaN(Date.parse(row.expectedDate)) &&
      Boolean(row.reason);

    if (!validSkippedPayment) {
      invalidSkippedPayments++;
      errors.push(`Invalid skipped payment: ${row.recurringId}`);
    }
  });

  report.skippedPayments = {
    total: skippedPaymentCount,
    invalid: invalidSkippedPayments
  };

  // Current generated dataset has no skipped-payment rows.
  assert(
    skippedPaymentCount === 0,
    `Expected 0 skipped payments, found ${skippedPaymentCount}`,
    errors
  );

  assert(
    invalidSkippedPayments === 0,
    "Invalid skipped recurring payment records found",
    errors
  );

  // 12. Validate transaction event history
  console.log("\n12. Validating transaction event history...");

  const eventIds = new Set();
  const eventCountsByTransaction = new Map();

  let eventCount = 0;
  let duplicateEventIds = 0;
  let invalidEventReferences = 0;
  let invalidEventTypes = 0;
  let invalidEventDates = 0;

  const allowedEventTypes = new Set([
    "CREATED",
    "CATEGORIZED"
  ]);

  await readCsv("transaction_events_v2.csv", row => {
    eventCount++;

    // Event primary key validation
    if (!row.eventId || eventIds.has(row.eventId)) {
      duplicateEventIds++;
    } else {
      eventIds.add(row.eventId);
    }

    // Transaction foreign key validation
    if (!transactionsById.has(row.transactionId)) {
      invalidEventReferences++;
    }

    // Event type validation
    if (!allowedEventTypes.has(row.eventType)) {
      invalidEventTypes++;
    }

    // Event timestamp validation
    if (
      !row.eventTimestamp ||
      Number.isNaN(Date.parse(row.eventTimestamp))
    ) {
      invalidEventDates++;
    }

    // Count events for each transaction
    const currentCount =
      eventCountsByTransaction.get(row.transactionId) || 0;

    eventCountsByTransaction.set(
      row.transactionId,
      currentCount + 1
    );
  });

  let transactionsWithInvalidEventCount = 0;

  for (const transactionId of transactionIds) {
    const eventCountForTransaction =
      eventCountsByTransaction.get(transactionId) || 0;

    if (eventCountForTransaction !== 2) {
      transactionsWithInvalidEventCount++;

      errors.push(
        `Expected 2 events for transaction ${transactionId}, found ${eventCountForTransaction}`
      );
    }
  }

  report.transactionEvents = {
    total: eventCount,
    duplicateEventIds,
    invalidReferences: invalidEventReferences,
    invalidEventTypes,
    invalidDates: invalidEventDates,
    transactionsWithInvalidEventCount
  };

  assert(
    eventCount === EXPECTED.transactions * 2,
    `Expected ${EXPECTED.transactions * 2} transaction events, found ${eventCount}`,
    errors
  );

  assert(
    duplicateEventIds === 0,
    "Duplicate or missing event IDs found",
    errors
  );

  assert(
    invalidEventReferences === 0,
    "Invalid transaction event references found",
    errors
  );

  assert(
    invalidEventTypes === 0,
    "Invalid transaction event types found",
    errors
  );

  assert(
    invalidEventDates === 0,
    "Invalid transaction event timestamps found",
    errors
  );

  assert(
    transactionsWithInvalidEventCount === 0,
    "Some transactions do not have exactly 2 event records",
    errors
  );

  // 13. Final validation report
  report.validationStatus = errors.length === 0 ? "PASSED" : "FAILED";
  report.totalErrors = errors.length;
  report.errors = errors;

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("\n========== VALIDATION REPORT ==========\n");
  console.log(JSON.stringify(report, null, 2));

  console.log("\n=======================================");
  console.log(`FINAL RESULT: ${report.validationStatus}`);
  console.log("=======================================\n");

  console.log("Report saved to:");
  console.log(REPORT_PATH);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

validate().catch(error => {
  console.error("\nValidation failed:", error.message);
  process.exitCode = 1;
});
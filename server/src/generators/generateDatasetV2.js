
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

const createRandom = require("../utils/seededRandom");

// =====================================
// CONFIGURATION
// =====================================

const SEED = 20261022;
const USER_COUNT = 1000;
const TRANSACTION_COUNT = 500000;

const random = createRandom(SEED);

// =====================================
// TRANSACTION CONFIGURATION
// =====================================

const TRANSACTION_DISTRIBUTION = {
  EXPENSE: 0.65,
  INCOME: 0.20,
  TRANSFER: 0.10,
  REFUND: 0.05,
};

const TRANSACTION_TYPES = [
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "REFUND",
];

const TRANSACTION_STATUSES = [
  "COMPLETED",
  "PENDING",
  "FAILED",
];

const TRANSACTION_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
];

const DATE_START = "2025-11-01T00:00:00.000Z";
const DATE_END = "2026-10-31T23:59:59.999Z";

const EXPECTED_TRANSACTION_COUNTS = {
  EXPENSE: 325000,
  INCOME: 100000,
  TRANSFER: 50000,
  REFUND: 25000,
};

const ROOT = path.resolve(__dirname, "../../../data");
const SOURCE = path.join(ROOT, "generated");
const OUTPUT = path.join(ROOT, "v2_staging");
const GROUND_TRUTH = path.join(OUTPUT, "ground_truth");
const EXPORTS = path.join(OUTPUT, "exports");

for (const folder of [OUTPUT, GROUND_TRUTH, EXPORTS]) {
  fs.mkdirSync(folder, { recursive: true });
}

// =====================================
// CSV HELPERS
// =====================================

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

async function writeCsv(filename, headers, rows) {
  const output = fs.createWriteStream(filename);

  const waitForDrain = () =>
    new Promise((resolve) => output.once("drain", resolve));

  output.write(headers.join(",") + "\n");

  for (const row of rows) {
    const line =
      headers.map((header) => csvEscape(row[header])).join(",") + "\n";

    if (!output.write(line)) {
      await waitForDrain();
    }
  }

  await new Promise((resolve, reject) => {
    output.once("error", reject);
    output.end(resolve);
  });
}

async function readCsv(filename) {
  const filePath = path.join(SOURCE, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Source file not found: ${filePath}`);
  }

  const input = fs.createReadStream(filePath);

  const reader = readline.createInterface({
    input,
    crlfDelay: Infinity,
  });

  const records = [];
  let headers = null;

  for await (const line of reader) {
    if (!line.trim()) continue;

    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    records.push(record);
  }

  return records;
}

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

// =====================================
// JSON AND ID HELPERS
// =====================================

function writeJson(filename, data) {
  fs.writeFileSync(
    filename,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function createId(prefix, number, length = 6) {
  return `${prefix}-${String(number).padStart(length, "0")}`;
}

function money(value) {
  return Number(Number(value).toFixed(2));
}

function randomDate() {
  const start = Date.parse("2025-11-01T00:00:00.000Z");
  const end = Date.parse("2026-10-31T23:59:59.999Z");

  const timestamp =
    start + Math.floor(random.random() * (end - start + 1));

  return new Date(timestamp).toISOString();
}

// =====================================
// VALIDATION HELPERS
// =====================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function calculateSha256(filename) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filename))
    .digest("hex");
}

console.log("====================================");
console.log("SpendWise V2 Generator initialized");
console.log(`Seed: ${SEED}`);
console.log(`Target users: ${USER_COUNT}`);
console.log(`Target transactions: ${TRANSACTION_COUNT}`);
console.log(`Output: ${OUTPUT}`);
console.log("====================================");

// =====================================
// LOAD EXISTING MASTER DATA
// =====================================


async function loadMasterData() {
  console.log("\nLoading existing master data...");

  const [
    users,
    accounts,
    categories,
    merchants,
    recurringSeries,
    budgets,
  ] = await Promise.all([
    readCsv("user_profiles.csv"),
    readCsv("accounts.csv"),
    readCsv("categories.csv"),
    readCsv("merchants.csv"),
    readCsv("recurring_series.csv"),
    readCsv("budgets.csv"),
  ]);

  console.log("\nMaster data loaded:");
  console.log(`Users: ${users.length}`);
  console.log(`Accounts: ${accounts.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Merchants: ${merchants.length}`);
  console.log(`Recurring series: ${recurringSeries.length}`);
  console.log(`Budgets: ${budgets.length}`);

  // Validate master data counts
  assert(users.length === USER_COUNT, "Unexpected user count");
  assert(categories.length === 12, "Unexpected category count");
  assert(merchants.length === 12, "Unexpected merchant count");
  assert(
    recurringSeries.length === 4000,
    "Unexpected recurring series count"
  );
  assert(
    budgets.length === 108000,
    `Unexpected budget count: ${budgets.length}`
  );

  assert(accounts.length >= USER_COUNT, "Insufficient accounts");

  // Validate budget primary keys and foreign keys
  const userIds = new Set(users.map((user) => user.userId));
  const categoryIds = new Set(
    categories.map((category) => category.categoryId)
  );

  const budgetIds = new Set();

  for (const budget of budgets) {
    assert(
      budget.budgetId,
      "Budget is missing budgetId"
    );

    assert(
      !budgetIds.has(budget.budgetId),
      `Duplicate budget ID: ${budget.budgetId}`
    );

    budgetIds.add(budget.budgetId);

    assert(
      userIds.has(budget.userId),
      `Invalid budget user: ${budget.budgetId}`
    );

    assert(
      categoryIds.has(budget.categoryId),
      `Invalid budget category: ${budget.budgetId}`
    );

    assert(
        Number.isFinite(Number(budget.budgetAmount)) &&
        Number(budget.budgetAmount) > 0,
        `Invalid budget amount: ${budget.budgetId}`
    );

    assert(
      Number.isInteger(Number(budget.month)) &&
        Number(budget.month) >= 1 &&
        Number(budget.month) <= 12,
      `Invalid budget month: ${budget.budgetId}`
    );

    assert(
      Number.isInteger(Number(budget.year)) &&
        Number(budget.year) >= 2025 &&
        Number(budget.year) <= 2026,
      `Invalid budget year: ${budget.budgetId}`
    );
  }

  console.log("Budget validation passed.");

  return {
    users,
    accounts,
    categories,
    merchants,
    recurringSeries,
    budgets,
  };
}


// =====================================
// PREPARE V2 ACCOUNTS
// =====================================

function prepareAccounts(accounts) {
  console.log("\nPreparing V2 account balances...");

  const preparedAccounts = accounts.map((account) => {
    const openingBalance = money(account.balance);

    return {
      ...account,
      openingBalance,
      balance: openingBalance,
    };
  });

  assert(
    preparedAccounts.every(
      (account) =>
        Number.isFinite(account.openingBalance) &&
        account.openingBalance >= 0
    ),
    "Invalid opening balance detected"
  );

  console.log(`Prepared ${preparedAccounts.length} accounts.`);
  console.log("Opening balances initialized from existing balances.");

  return preparedAccounts;
}
// const transferValidation = validateTransferPairs(allTransactions);


function validateAccountReconciliation(
  preparedAccounts,
  transactions,
  finalAccounts
) {
  console.log("\nValidating account reconciliation...");

  const accountMovements = new Map();

  for (const account of preparedAccounts) {
    accountMovements.set(account.accountId, {
      credits: 0,
      debits: 0,
    });
  }

  for (const transaction of transactions) {
    if (transaction.status !== "COMPLETED") {
      continue;
    }

    const amountInPaise = Math.round(
      Number(transaction.amount) * 100
    );

    assert(
      Number.isSafeInteger(amountInPaise) &&
      amountInPaise > 0,
      `Invalid transaction amount: ${transaction.transactionId}`
    );

    const movement = accountMovements.get(transaction.accountId);

    assert(
      movement,
      `Unknown account in transaction: ${transaction.transactionId}`
    );

    if (
      transaction.transactionType === "INCOME" ||
      transaction.transactionType === "REFUND"
    ) {
      movement.credits += amountInPaise;
    } else if (transaction.transactionType === "EXPENSE") {
      movement.debits += amountInPaise;
    } else if (transaction.transactionType === "TRANSFER") {
      if (transaction.transferDirection === "OUT") {
        movement.debits += amountInPaise;
      } else if (transaction.transferDirection === "IN") {
        movement.credits += amountInPaise;
      } else {
        throw new Error(
          `Invalid transfer direction: ${transaction.transactionId}`
        );
      }
    } else {
      throw new Error(
        `Unknown transaction type: ${transaction.transactionType}`
      );
    }
  }

  const finalAccountMap = new Map(
    finalAccounts.map((account) => [
      account.accountId,
      account,
    ])
  );

  let reconciledCount = 0;

  for (const account of preparedAccounts) {
    const movement = accountMovements.get(account.accountId);
    const finalAccount = finalAccountMap.get(account.accountId);

    assert(
      finalAccount,
      `Missing final account: ${account.accountId}`
    );

    const openingBalance = Math.round(
      Number(account.openingBalance) * 100
    );

    const actualClosingBalance = Math.round(
      Number(finalAccount.balance) * 100
    );

    const expectedClosingBalance =
      openingBalance +
      movement.credits -
      movement.debits;

    assert(
      expectedClosingBalance >= 0,
      `Negative expected balance: ${account.accountId}`
    );

    assert(
      expectedClosingBalance === actualClosingBalance,
      `Reconciliation failed for ${account.accountId}. ` +
      `Expected: ${expectedClosingBalance / 100}, ` +
      `Actual: ${actualClosingBalance / 100}`
    );

    reconciledCount++;
  }

  console.log(
    `Account reconciliation passed: ${reconciledCount} accounts`
  );

  return {
    reconciledAccounts: reconciledCount,
    totalAccounts: preparedAccounts.length,
    status: "PASSED",
  };
}

function validateTransferPairs(transactions) {
  console.log("\nValidating paired transfer transactions...");

  const transferGroups = new Map();

  for (const transaction of transactions) {
    if (transaction.transactionType !== "TRANSFER") {
      assert(
        !transaction.transferGroupId &&
        !transaction.transferDirection &&
        !transaction.counterpartyAccountId,
        `Non-transfer transaction contains transfer fields: ${transaction.transactionId}`
      );
      continue;
    }

    assert(
      transaction.transferGroupId,
      `Missing transfer group ID: ${transaction.transactionId}`
    );

    assert(
      transaction.transferDirection === "IN" ||
      transaction.transferDirection === "OUT",
      `Invalid transfer direction: ${transaction.transactionId}`
    );

    assert(
      transaction.counterpartyAccountId,
      `Missing transfer counterparty: ${transaction.transactionId}`
    );

    if (!transferGroups.has(transaction.transferGroupId)) {
      transferGroups.set(transaction.transferGroupId, []);
    }

    transferGroups.get(transaction.transferGroupId).push(transaction);
  }

  let validatedPairs = 0;

  for (const [groupId, group] of transferGroups) {
    assert(
      group.length === 2,
      `Transfer group ${groupId} must contain exactly 2 transactions. Found: ${group.length}`
    );

    const outgoing = group.find(
      (transaction) => transaction.transferDirection === "OUT"
    );

    const incoming = group.find(
      (transaction) => transaction.transferDirection === "IN"
    );

    assert(
      outgoing && incoming,
      `Transfer group ${groupId} must contain one OUT and one IN transaction`
    );

    assert(
      outgoing.transactionId !== incoming.transactionId,
      `Duplicate transaction ID in transfer group ${groupId}`
    );

    assert(
      outgoing.userId === incoming.userId,
      `User mismatch in transfer group ${groupId}`
    );

    const outgoingAmount = Math.round(
      Number(outgoing.amount) * 100
    );

    const incomingAmount = Math.round(
      Number(incoming.amount) * 100
    );

    assert(
      outgoingAmount === incomingAmount,
      `Amount mismatch in transfer group ${groupId}`
    );

    assert(
      outgoing.transactionDate === incoming.transactionDate,
      `Transaction date mismatch in transfer group ${groupId}`
    );

    assert(
      outgoing.status === "COMPLETED" &&
      incoming.status === "COMPLETED",
      `Both transfers must be COMPLETED in group ${groupId}`
    );

    assert(
      outgoing.accountId !== incoming.accountId,
      `Source and destination accounts must differ in group ${groupId}`
    );

    assert(
      outgoing.counterpartyAccountId === incoming.accountId,
      `Outgoing counterparty mismatch in transfer group ${groupId}`
    );

    assert(
      incoming.counterpartyAccountId === outgoing.accountId,
      `Incoming counterparty mismatch in transfer group ${groupId}`
    );

    assert(
      outgoing.categoryId === incoming.categoryId,
      `Category mismatch in transfer group ${groupId}`
    );

    validatedPairs++;
  }

  console.log(`Transfer pairs validated: ${validatedPairs}`);
  console.log(`Transfer entries validated: ${validatedPairs * 2}`);

  return {
    validatedPairs,
    validatedEntries: validatedPairs * 2,
    status: "PASSED",
  };
}



function validateRefundRelationships(transactions) {
  console.log("\nValidating refund relationships...");

  const transactionMap = new Map();
  const refundedAmounts = new Map();

  for (const transaction of transactions) {
    assert(
      !transactionMap.has(transaction.transactionId),
      `Duplicate transaction ID: ${transaction.transactionId}`
    );

    transactionMap.set(transaction.transactionId, transaction);
  }

  const refunds = transactions.filter(
    (transaction) => transaction.transactionType === "REFUND"
  );

  for (const refund of refunds) {
    assert(
      refund.relatedTransactionId,
      `Refund missing original transaction reference: ${refund.transactionId}`
    );

    const original = transactionMap.get(
      refund.relatedTransactionId
    );

    assert(
      original,
      `Original transaction not found for refund: ${refund.transactionId}`
    );

    assert(
      original.transactionType === "EXPENSE" &&
      original.status === "COMPLETED",
      `Refund must reference a completed expense: ${refund.transactionId}`
    );

    assert(
      refund.userId === original.userId,
      `Refund user mismatch: ${refund.transactionId}`
    );

    assert(
      refund.accountId === original.accountId,
      `Refund account mismatch: ${refund.transactionId}`
    );

    assert(
      Date.parse(refund.transactionDate) >=
      Date.parse(original.transactionDate),
      `Refund date precedes original expense: ${refund.transactionId}`
    );

    const refundAmount = Math.round(
      Number(refund.amount) * 100
    );

    assert(
      Number.isSafeInteger(refundAmount) && refundAmount > 0,
      `Invalid refund amount: ${refund.transactionId}`
    );

    const originalAmount = Math.round(
      Number(original.amount) * 100
    );

    const previousRefunded =
      refundedAmounts.get(original.transactionId) || 0;

    const totalRefunded = previousRefunded + refundAmount;

    assert(
      totalRefunded <= originalAmount,
      `Refunds exceed original expense: ${original.transactionId}`
    );

    refundedAmounts.set(
      original.transactionId,
      totalRefunded
    );
  }

  console.log(`Refund relationships validated: ${refunds.length}`);

  return {
    validatedRefunds: refunds.length,
    status: "PASSED",
  };
}



// =====================================
// MASTER DATA LOOKUP MAPS
// =====================================

function createMasterDataMaps(masterData, preparedAccounts) {
  console.log("\nCreating master-data lookup maps...");

  const usersById = new Map();
  const accountsByUser = new Map();
  const accountsById = new Map();
  const categoriesById = new Map();
  const merchantsById = new Map();
  const recurringByUser = new Map();

  // Users
  for (const user of masterData.users) {
    usersById.set(user.userId, user);
  }

  // Accounts
  for (const account of preparedAccounts) {
    accountsById.set(account.accountId, account);

    if (!accountsByUser.has(account.userId)) {
      accountsByUser.set(account.userId, []);
    }

    accountsByUser.get(account.userId).push(account);
  }

  // Categories
  for (const category of masterData.categories) {
    categoriesById.set(category.categoryId, category);
  }

  // Merchants
  for (const merchant of masterData.merchants) {
    merchantsById.set(merchant.merchantId, merchant);
  }

  // Recurring series
  for (const series of masterData.recurringSeries) {
    if (!recurringByUser.has(series.userId)) {
      recurringByUser.set(series.userId, []);
    }

    recurringByUser.get(series.userId).push(series);
  }

  // Validate account ownership
  for (const account of preparedAccounts) {
    assert(
      usersById.has(account.userId),
      `Unknown user for account ${account.accountId}`
    );
  }

  // Validate recurring relationships
  for (const series of masterData.recurringSeries) {
    assert(
      usersById.has(series.userId),
      `Unknown user for recurring series ${series.recurringId}`
    );

    assert(
      categoriesById.has(series.categoryId),
      `Unknown category for recurring series ${series.recurringId}`
    );

    assert(
      !series.merchantId || merchantsById.has(series.merchantId),
      `Unknown merchant for recurring series ${series.recurringId}`
    );
  }

  console.log(`User lookup: ${usersById.size}`);
  console.log(`Account lookup: ${accountsById.size}`);
  console.log(`Category lookup: ${categoriesById.size}`);
  console.log(`Merchant lookup: ${merchantsById.size}`);
  console.log(`Recurring lookup: ${masterData.recurringSeries.length}`);

  return {
    usersById,
    accountsByUser,
    accountsById,
    categoriesById,
    merchantsById,
    recurringByUser,
  };
}
    
// =====================================
// TRANSACTION GENERATION HELPERS
// =====================================

let transactionSequence = 0;

function nextTransactionId() {
  transactionSequence++;

  return `TXN-2026-${String(transactionSequence).padStart(8, "0")}`;
}

function generateAmount(min, max) {
  return money(random.integer(min * 100, max * 100) / 100);
}

function generateTransactionDate() {
  const start = Date.parse(DATE_START);
  const end = Date.parse(DATE_END);

  const timestamp =
    start + Math.floor(random.random() * (end - start + 1));

  return new Date(timestamp).toISOString();
}

function selectAccount(accounts) {
  assert(accounts && accounts.length > 0, "No account available");

  return random.pick(accounts);
}

function selectCategory(categories, categoryType) {
  const available = categories.filter(
    (category) => category.categoryType === categoryType
  );

  assert(
    available.length > 0,
    `No category available for ${categoryType}`
  );

  return random.pick(available);
}

function selectMerchant(merchants) {
  const available = merchants.filter(
    (merchant) => merchant.isActive === "true"
  );

  return random.pick(available);
}

function createTransactionRecord({
  userId,
  accountId,
  merchantId = null,
  categoryId,
  amount,
  transactionType,
  transactionDate,
  description,
  status = "COMPLETED",
  transferGroupId = null,
  counterpartyAccountId = null,
  transferDirection = null,
  relatedTransactionId = null,
  timezone = "Asia/Kolkata",
  recurringId = null,
}) {
  return {
    transactionId: nextTransactionId(),
    userId,
    accountId,
    merchantId,
    categoryId,
    amount: money(amount),
    transactionType,
    description,
    transactionDate,
    status,
    transferGroupId,
    counterpartyAccountId,
    transferDirection,
    relatedTransactionId,
    timezone,
    recurringId,
    isAnomaly: false,
    anomalyType: null,
  };

}

    
// =====================================
// EXPENSE AND INCOME GENERATION
// =====================================


async function generateRegularTransactions(masterData, lookupMaps) {
  console.log("\nGenerating income and regular expense transactions...");

  const transactions = [];
  const accountBalances = new Map();

  for (const account of masterData.accounts) {
  const openingBalance = Number(
    account.openingBalance ?? account.balance
  );

  assert(
    Number.isFinite(openingBalance) && openingBalance >= 0,
    `Invalid opening balance for account ${account.accountId}`
  );

  accountBalances.set(account.accountId, openingBalance);
}

  const expenseCategories = masterData.categories.filter(
    (category) => category.categoryType === "EXPENSE"
  );

  const incomeCategories = masterData.categories.filter(
    (category) => category.categoryType === "INCOME"
  );

  const activeMerchants = masterData.merchants.filter(
    (merchant) => merchant.isActive === "true"
  );

  assert(expenseCategories.length > 0, "No expense categories found");
  assert(incomeCategories.length > 0, "No income categories found");

  const userIds = masterData.users.map((user) => user.userId);

  function createTransaction(type) {
    const userId = random.pick(userIds);
    const userAccounts = lookupMaps.accountsByUser.get(userId);

    assert(
      userAccounts && userAccounts.length > 0,
      `No accounts found for ${userId}`
    );

    const eligibleAccounts = type === "EXPENSE"
      ? userAccounts.filter(
          (account) => accountBalances.get(account.accountId) >= 1
        )
      : userAccounts;

    assert(
      eligibleAccounts.length > 0,
      `No account with sufficient balance for ${userId}`
    );

    const account = random.pick(eligibleAccounts);

    const category = random.pick(
      type === "EXPENSE" ? expenseCategories : incomeCategories
    );

    const matchingMerchants = activeMerchants.filter(
      (merchant) => merchant.categoryId === category.categoryId
    );

    const merchant = matchingMerchants.length > 0
      ? random.pick(matchingMerchants)
      : null;

    const status = random.pick(TRANSACTION_STATUSES);
    const balance = accountBalances.get(account.accountId);

    let amount;

    if (type === "EXPENSE") {
      const maximum = Math.min(500, Math.floor(balance));
      amount = generateAmount(1, maximum);

      if (status === "COMPLETED") {
        accountBalances.set(
          account.accountId,
          money(balance - amount)
        );
      }
    } else {
      amount = generateAmount(500, 100000);

      if (status === "COMPLETED") {
        accountBalances.set(
          account.accountId,
          money(balance + amount)
        );
      }
    }

    const transaction = createTransactionRecord({
      userId,
      accountId: account.accountId,
      merchantId: merchant ? merchant.merchantId : null,
      categoryId: category.categoryId,
      amount,
      transactionType: type,
      transactionDate: generateTransactionDate(),
      description: merchant
        ? `${merchant.merchantName} ${type.toLowerCase()}`
        : "Other income",
      status,
      timezone: random.pick(TRANSACTION_TIMEZONES),
    });

    transactions.push(transaction);
  }

  // Generate income first so accounts receive funds before expenses.
  for (let i = 0; i < EXPECTED_TRANSACTION_COUNTS.INCOME; i++) {
    createTransaction("INCOME");

    if ((i + 1) % 25000 === 0) {
      console.log(`Generated ${i + 1} income transactions`);
    }
  }

  console.log("Income generation completed.");

  // Recurring transactions will be generated separately.
  // Regular expenses will be filled after recurring payments
  // so the combined expense count remains exactly 325,000.

  console.log(`Income transactions generated: ${transactions.length}`);

  return {
    transactions,
    accountBalances,
    createRegularExpense: () => createTransaction("EXPENSE"),
  };
}

    
// =====================================
// TRANSFER GENERATION
// =====================================


async function generateTransfers(masterData, lookupMaps, accountBalances) {
  console.log("\nGenerating paired transfer transactions...");

  const transfers = [];
  const TRANSFER_COUNT = EXPECTED_TRANSACTION_COUNTS.TRANSFER;
  const TRANSFER_PAIRS = TRANSFER_COUNT / 2;

  let transferGroupSequence = 0;

  const eligibleUsers = masterData.users
    .map((user) => user.userId)
    .filter((userId) => {
      const accounts = lookupMaps.accountsByUser.get(userId);
      return accounts && accounts.length >= 2;
    });

  assert(
    eligibleUsers.length > 0,
    "No users have at least two accounts"
  );

  const category = lookupMaps.categoriesById.get("CAT-012");

  assert(category, "Transfer category CAT-012 not found");

  for (let i = 0; i < TRANSFER_PAIRS; i++) {
    let selectedUser = null;
let sourceAccount = null;
let destinationAccount = null;

const fundedSources = [];

for (const userId of eligibleUsers) {
  const userAccounts = lookupMaps.accountsByUser.get(userId);

  for (const account of userAccounts) {
    const balance = accountBalances.get(account.accountId);

    if (Number.isFinite(balance) && balance >= 1) {
      fundedSources.push({
        userId,
        account,
      });
    }
  }
}

assert(
  fundedSources.length > 0,
  `Insufficient funded accounts for transfer pair ${i + 1}`
);

const selectedSource = random.pick(fundedSources);

selectedUser = selectedSource.userId;
sourceAccount = selectedSource.account;

const destinationCandidates = lookupMaps.accountsByUser
  .get(selectedUser)
  .filter(
    (account) => account.accountId !== sourceAccount.accountId
  );

assert(
  destinationCandidates.length > 0,
  `No destination account found for user ${selectedUser}`
);

destinationAccount = random.pick(destinationCandidates);
    assert(
      selectedUser && sourceAccount && destinationAccount,
      `Unable to find a funded transfer source for pair ${i + 1}`
    );

    const sourceBalance = accountBalances.get(
      sourceAccount.accountId
    );

    const amount = generateAmount(
      1,
      Math.min(1000, Math.floor(sourceBalance))
    );

    const transactionDate = generateTransactionDate();

    transferGroupSequence++;

    const transferGroupId =
      `TRF-2026-${String(transferGroupSequence).padStart(8, "0")}`;

    const outgoing = createTransactionRecord({
      userId: selectedUser,
      accountId: sourceAccount.accountId,
      merchantId: null,
      categoryId: category.categoryId,
      amount,
      transactionType: "TRANSFER",
      transactionDate,
      description: "Transfer to another account",
      status: "COMPLETED",
      transferGroupId,
      counterpartyAccountId: destinationAccount.accountId,
      transferDirection: "OUT",
      timezone: "Asia/Kolkata",
    });

    const incoming = createTransactionRecord({
      userId: selectedUser,
      accountId: destinationAccount.accountId,
      merchantId: null,
      categoryId: category.categoryId,
      amount,
      transactionType: "TRANSFER",
      transactionDate,
      description: "Transfer from another account",
      status: "COMPLETED",
      transferGroupId,
      counterpartyAccountId: sourceAccount.accountId,
      transferDirection: "IN",
      timezone: "Asia/Kolkata",
    });

    transfers.push(outgoing, incoming);

    accountBalances.set(
      sourceAccount.accountId,
      money(sourceBalance - amount)
    );

    const destinationBalance = accountBalances.get(
      destinationAccount.accountId
    );

    accountBalances.set(
      destinationAccount.accountId,
      money(destinationBalance + amount)
    );

    if ((i + 1) % 5000 === 0) {
      console.log(`Generated ${i + 1} transfer pairs`);
    }
  }

  assert(
    transfers.length === TRANSFER_COUNT,
    `Expected ${TRANSFER_COUNT} transfer entries, generated ${transfers.length}`
  );

  console.log(`Transfer entries generated: ${transfers.length}`);
  console.log(`Transfer pairs generated: ${transferGroupSequence}`);

  return transfers;
}

    
// =====================================
// REFUND GENERATION
// =====================================


async function generateRefunds(
  originalTransactions,
  accountBalances
) {
  console.log("\nGenerating refund transactions...");

  const refunds = [];
  const refundCount = EXPECTED_TRANSACTION_COUNTS.REFUND;

  const eligibleExpenses = originalTransactions.filter(
    (transaction) =>
      transaction.transactionType === "EXPENSE" &&
      transaction.status === "COMPLETED" &&
      Number(transaction.amount) >= 1
  );

  const refundedAmounts = new Map();

  assert(
    eligibleExpenses.length > 0,
    "No eligible completed expenses found for refunds"
  );

  for (let i = 0; i < refundCount; i++) {
    let original;
    let remainingAmount = 0;

    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = random.pick(eligibleExpenses);

      const alreadyRefunded =
        refundedAmounts.get(candidate.transactionId) || 0;

      const remaining =
        Number(candidate.amount) - alreadyRefunded;

      if (remaining >= 1) {
        original = candidate;
        remainingAmount = remaining;
        break;
      }
    }

    assert(
      original,
      "No expense has enough remaining refundable amount"
    );

    const refundAmount = generateAmount(
      1,
      Math.floor(remainingAmount * 100) / 100
    );

    refundedAmounts.set(
      original.transactionId,
      money(
        (refundedAmounts.get(original.transactionId) || 0) +
        refundAmount
      )
    );

    const refundStatus = random.pick(TRANSACTION_STATUSES);

    // Refund date must be on or after the original transaction date.
    const originalTimestamp = Date.parse(original.transactionDate);
    const endTimestamp = Date.parse(DATE_END);

    assert(
      Number.isFinite(originalTimestamp) &&
      originalTimestamp <= endTimestamp,
      `Invalid original transaction date: ${original.transactionId}`
    );

    const refundTimestamp =
      originalTimestamp +
      Math.floor(
        random.random() *
        (endTimestamp - originalTimestamp + 1)
      );

    const refundDate = new Date(refundTimestamp).toISOString();

    const refund = createTransactionRecord({
      userId: original.userId,
      accountId: original.accountId,
      merchantId: original.merchantId,
      categoryId: original.categoryId,
      amount: refundAmount,
      transactionType: "REFUND",
      transactionDate: refundDate,
      description: `Refund for ${original.description}`,
      status: refundStatus,
      relatedTransactionId: original.transactionId,
      timezone: original.timezone,
    });

    refunds.push(refund);

    if (refundStatus === "COMPLETED") {
      const currentBalance = accountBalances.get(original.accountId);

      accountBalances.set(
        original.accountId,
        money(currentBalance + refundAmount)
      );
    }

    if ((i + 1) % 5000 === 0) {
      console.log(`Generated ${i + 1} refund transactions`);
    }
  }

  assert(
    refunds.length === refundCount,
    `Expected ${refundCount} refunds, generated ${refunds.length}`
  );

  console.log(`Refund transactions generated: ${refunds.length}`);

  return refunds;
}
    
// =====================================
// RECURRING PAYMENT GENERATION
// =====================================


function generateRecurringTransactions(
  masterData,
  lookupMaps,
  accountBalances
) {
  console.log("\nGenerating recurring payment transactions...");

  const recurringTransactions = [];
  const skippedPayments = [];

  const recurringSeries = masterData.recurringSeries.filter(
    (series) => series.status === "ACTIVE"
  );

  for (const series of recurringSeries) {
    const userAccounts = lookupMaps.accountsByUser.get(series.userId);

    assert(
      userAccounts && userAccounts.length > 0,
      `No account found for recurring series ${series.recurringId}`
    );

    const startDate = new Date(`${series.startDate}T00:00:00.000Z`);
    const endDate = new Date(DATE_END);

    let currentDate = new Date(startDate);
    let paymentNumber = 0;

    while (currentDate <= endDate) {
      const amount = Number(series.expectedAmount);

      // Select the account with the highest available balance.
      const sortedAccounts = [...userAccounts].sort(
        (a, b) =>
          accountBalances.get(b.accountId) -
          accountBalances.get(a.accountId)
      );

      const account = sortedAccounts[0];
      const currentBalance = accountBalances.get(account.accountId);

      if (currentBalance >= amount) {
        const transaction = createTransactionRecord({
          userId: series.userId,
          accountId: account.accountId,
          merchantId: series.merchantId,
          categoryId: series.categoryId,
          amount,
          transactionType: "EXPENSE",
          transactionDate: currentDate.toISOString(),
          description: series.recurringName,
          status: "COMPLETED",
          recurringId: series.recurringId,
          timezone: "Asia/Kolkata",
        });

        recurringTransactions.push(transaction);

        accountBalances.set(
          account.accountId,
          money(currentBalance - amount)
        );
      } else {
        skippedPayments.push({
          recurringId: series.recurringId,
          userId: series.userId,
          expectedAmount: amount,
          expectedDate: currentDate.toISOString(),
          reason: "INSUFFICIENT_BALANCE",
        });
      }

      paymentNumber++;

      // All current recurring records are monthly.
      if (series.frequency === "MONTHLY") {
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      } else if (series.frequency === "QUARTERLY") {
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 3);
      } else if (series.frequency === "YEARLY") {
        currentDate.setUTCFullYear(currentDate.getUTCFullYear() + 1);
      } else if (series.frequency === "WEEKLY") {
        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
      } else if (series.frequency === "BIWEEKLY") {
        currentDate.setUTCDate(currentDate.getUTCDate() + 14);
      } else {
        throw new Error(
          `Unsupported recurring frequency: ${series.frequency}`
        );
      }
    }
  }

  console.log(
    `Recurring payments generated: ${recurringTransactions.length}`
  );

  console.log(
    `Recurring payments skipped: ${skippedPayments.length}`
  );

  return {
    recurringTransactions,
    skippedPayments,
  };
}



function validateRecurringRelationships(
  transactions,
  skippedPayments,
  masterData,
  lookupMaps
) {
  console.log("\nValidating recurring payment relationships...");

  const recurringSeriesMap = new Map(
    masterData.recurringSeries.map((series) => [
      series.recurringId,
      series,
    ])
  );

  const occurrenceKeys = new Set();
  const expectedOccurrenceKeys = new Set();

  let validatedTransactions = 0;
  let validatedSkippedPayments = 0;

  const endDate = new Date(DATE_END);

  // Build the complete expected payment schedule.
  for (const series of masterData.recurringSeries) {
    if (series.status !== "ACTIVE") {
      continue;
    }

    let currentDate = new Date(
      `${series.startDate}T00:00:00.000Z`
    );

    while (currentDate <= endDate) {
      const occurrenceKey =
        `${series.recurringId}|${currentDate.toISOString()}`;

      expectedOccurrenceKeys.add(occurrenceKey);

      if (series.frequency === "MONTHLY") {
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      } else if (series.frequency === "QUARTERLY") {
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 3);
      } else if (series.frequency === "YEARLY") {
        currentDate.setUTCFullYear(
          currentDate.getUTCFullYear() + 1
        );
      } else if (series.frequency === "WEEKLY") {
        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
      } else if (series.frequency === "BIWEEKLY") {
        currentDate.setUTCDate(currentDate.getUTCDate() + 14);
      } else {
        throw new Error(
          `Unsupported recurring frequency: ${series.frequency}`
        );
      }
    }
  }

  // Validate generated recurring transactions.
  for (const transaction of transactions) {
    if (!transaction.recurringId) {
      continue;
    }

    const series = recurringSeriesMap.get(
      transaction.recurringId
    );

    assert(
      series,
      `Unknown recurring series: ${transaction.recurringId}`
    );

    assert(
      series.status === "ACTIVE",
      `Inactive recurring series used: ${transaction.recurringId}`
    );

    assert(
      transaction.userId === series.userId,
      `Recurring user mismatch: ${transaction.transactionId}`
    );

    assert(
      transaction.categoryId === series.categoryId,
      `Recurring category mismatch: ${transaction.transactionId}`
    );

    assert(
      transaction.merchantId === series.merchantId,
      `Recurring merchant mismatch: ${transaction.transactionId}`
    );

    assert(
      transaction.transactionType === "EXPENSE" &&
      transaction.status === "COMPLETED",
      `Invalid recurring transaction: ${transaction.transactionId}`
    );

    const transactionAmount = Math.round(
      Number(transaction.amount) * 100
    );

    const expectedAmount = Math.round(
      Number(series.expectedAmount) * 100
    );

    assert(
      Number.isSafeInteger(transactionAmount) &&
      transactionAmount === expectedAmount,
      `Recurring amount mismatch: ${transaction.transactionId}`
    );

    const account = lookupMaps.accountsById.get(
      transaction.accountId
    );

    assert(
      account && account.userId === series.userId,
      `Invalid recurring account: ${transaction.transactionId}`
    );

    const transactionDate = Date.parse(
      transaction.transactionDate
    );

    assert(
      Number.isFinite(transactionDate),
      `Invalid recurring payment date: ${transaction.transactionId}`
    );

    const occurrenceKey =
      `${series.recurringId}|${transaction.transactionDate}`;

    assert(
      expectedOccurrenceKeys.has(occurrenceKey),
      `Unexpected recurring transaction date: ${occurrenceKey}`
    );

    assert(
      !occurrenceKeys.has(occurrenceKey),
      `Duplicate recurring payment occurrence: ${occurrenceKey}`
    );

    occurrenceKeys.add(occurrenceKey);
    validatedTransactions++;
  }

  // Validate skipped recurring payments.
  for (const skipped of skippedPayments) {
    const series = recurringSeriesMap.get(
      skipped.recurringId
    );

    assert(
      series,
      `Unknown recurring series in skipped payment: ${skipped.recurringId}`
    );

    assert(
      series.status === "ACTIVE",
      `Inactive series has skipped payment: ${skipped.recurringId}`
    );

    assert(
      skipped.userId === series.userId,
      `Skipped payment user mismatch: ${skipped.recurringId}`
    );

    assert(
      skipped.reason === "INSUFFICIENT_BALANCE",
      `Invalid skipped payment reason: ${skipped.recurringId}`
    );

    const skippedAmount = Math.round(
      Number(skipped.expectedAmount) * 100
    );

    const seriesAmount = Math.round(
      Number(series.expectedAmount) * 100
    );

    assert(
      Number.isSafeInteger(skippedAmount) &&
      skippedAmount === seriesAmount,
      `Skipped payment amount mismatch: ${skipped.recurringId}`
    );

    const skippedDate = Date.parse(skipped.expectedDate);

    assert(
      Number.isFinite(skippedDate),
      `Invalid skipped payment date: ${skipped.recurringId}`
    );

    const occurrenceKey =
      `${series.recurringId}|${skipped.expectedDate}`;

    assert(
      expectedOccurrenceKeys.has(occurrenceKey),
      `Unexpected skipped payment date: ${occurrenceKey}`
    );

    assert(
      !occurrenceKeys.has(occurrenceKey),
      `Duplicate recurring occurrence: ${occurrenceKey}`
    );

    occurrenceKeys.add(occurrenceKey);
    validatedSkippedPayments++;
  }

  // Verify that every expected payment is accounted for.
  const missingOccurrences = [];

  for (const expectedKey of expectedOccurrenceKeys) {
    if (!occurrenceKeys.has(expectedKey)) {
      missingOccurrences.push(expectedKey);
    }
  }

  assert(
    missingOccurrences.length === 0,
    `Missing recurring occurrences: ${missingOccurrences.length}. ` +
    `Examples: ${missingOccurrences.slice(0, 5).join(", ")}`
  );

  console.log(
    `Expected recurring occurrences: ${expectedOccurrenceKeys.size}`
  );

  console.log(
    `Recurring transactions validated: ${validatedTransactions}`
  );

  console.log(
    `Skipped recurring payments validated: ${validatedSkippedPayments}`
  );

  console.log(
    "All expected recurring occurrences are accounted for."
  );

  return {
    expectedOccurrences: expectedOccurrenceKeys.size,
    validatedTransactions,
    validatedSkippedPayments,
    missingOccurrences: 0,
    status: "PASSED",
  };
}


// =====================================
// TRANSACTION EVENT GENERATION
// =====================================

async function writeTransactionEventsCsv(filename, transactions) {
  console.log("\nWriting transaction event history...");

  const headers = [
    "eventId",
    "transactionId",
    "eventType",
    "previousValue",
    "newValue",
    "eventTimestamp",
    "notes",
  ];

  const output = fs.createWriteStream(filename);
  let eventSequence = 0;

  const waitForDrain = () =>
    new Promise((resolve) => output.once("drain", resolve));

  const writeLine = async (event) => {
    const line =
      headers.map((header) => csvEscape(event[header])).join(",") + "\n";

    if (!output.write(line)) {
      await waitForDrain();
    }
  };

  try {
    output.write(headers.join(",") + "\n");

    for (const transaction of transactions) {
      const createdTime = new Date(transaction.transactionDate);

      assert(
        Number.isFinite(createdTime.getTime()),
        `Invalid transaction date: ${transaction.transactionId}`
      );

      // CREATED event
      eventSequence++;

      await writeLine({
        eventId: `EVT-${String(eventSequence).padStart(10, "0")}`,
        transactionId: transaction.transactionId,
        eventType: "CREATED",
        previousValue: null,
        newValue: JSON.stringify({
          status: transaction.status,
          amount: transaction.amount,
        }),
        eventTimestamp: createdTime.toISOString(),
        notes: "Transaction created",
      });

      // CATEGORIZED event
      eventSequence++;

      const categorizedTime = new Date(
        createdTime.getTime() + 1000
      );

      await writeLine({
        eventId: `EVT-${String(eventSequence).padStart(10, "0")}`,
        transactionId: transaction.transactionId,
        eventType: "CATEGORIZED",
        previousValue: null,
        newValue: JSON.stringify({
          categoryId: transaction.categoryId,
        }),
        eventTimestamp: categorizedTime.toISOString(),
        notes: "Transaction categorized",
      });
    }

    await new Promise((resolve, reject) => {
      output.once("error", reject);
      output.end(resolve);
    });

    console.log(`Transaction events written: ${eventSequence}`);
  } catch (error) {
    output.destroy();
    throw error;
  }
}

// =====================================
// ANOMALY AND GROUND-TRUTH GENERATION
// =====================================



function generateAnomalyCases(transactions, masterData) {
  console.log("\nPreparing labelled anomaly cases...");

  const anomalies = [];
  const groundTruth = [];
  const anomalyTransactions = [];
  const invalidBudgetCases = [];

  const transfer = transactions.find(
    (item) =>
      item.transactionType === "TRANSFER" &&
      item.transferDirection === "OUT"
  );

  const refund = transactions.find(
    (item) => item.transactionType === "REFUND"
  );

  const recurring = masterData.recurringSeries.find(
    (item) => item.status === "ACTIVE"
  );

  const boundaryTransaction = transactions.find(
    (item) => item.transactionType === "EXPENSE"
  );

  assert(transfer, "No transfer available for anomaly example");
  assert(refund, "No refund available for anomaly example");
  assert(recurring, "No recurring series available");
  assert(
    boundaryTransaction,
    "No expense available for timezone example"
  );

  // 1. Double-counted transfer
  const duplicateTransfer = {
    ...transfer,
    isAnomaly: true,
    anomalyType: "DOUBLE_COUNTED_TRANSFER",
  };

  anomalyTransactions.push(duplicateTransfer);

  anomalies.push({
    anomalyId: "ANO-0001",
    anomalyType: "DOUBLE_COUNTED_TRANSFER",
    transactionId: transfer.transactionId,
    description: "Duplicate transfer entry",
    expectedOutcome: "DETECT_DUPLICATE_TRANSFER",
  });

  groundTruth.push({
    anomalyId: "ANO-0001",
    anomalyType: "DOUBLE_COUNTED_TRANSFER",
    affectedTransactionId: transfer.transactionId,
    expectedOutcome: "DETECT_DUPLICATE_TRANSFER",
    explanation:
      "A transfer leg appears twice in the anomaly test data.",
  });

  // 2. Refund incorrectly classified as an expense
  const incorrectRefund = {
    ...refund,
    transactionType: "EXPENSE",
    isAnomaly: true,
    anomalyType: "REFUND_TREATED_AS_EXPENSE",
  };

  anomalyTransactions.push(incorrectRefund);

  anomalies.push({
    anomalyId: "ANO-0002",
    anomalyType: "REFUND_TREATED_AS_EXPENSE",
    transactionId: refund.transactionId,
    description: "Refund incorrectly classified as EXPENSE",
    expectedOutcome: "CLASSIFY_AS_REFUND",
  });

  groundTruth.push({
    anomalyId: "ANO-0002",
    anomalyType: "REFUND_TREATED_AS_EXPENSE",
    affectedTransactionId: refund.transactionId,
    actualTransactionType: "REFUND",
    incorrectTransactionType: "EXPENSE",
    expectedOutcome: "CLASSIFY_AS_REFUND",
    explanation:
      "The original transaction is a refund, not an expense.",
  });

  // 3. Skipped recurring payment
  anomalies.push({
    anomalyId: "ANO-0003",
    anomalyType: "SKIPPED_RECURRING_PAYMENT",
    transactionId: null,
    recurringId: recurring.recurringId,
    description: "Expected recurring payment is missing",
    expectedOutcome: "DETECT_MISSING_PAYMENT",
  });

  groundTruth.push({
    anomalyId: "ANO-0003",
    anomalyType: "SKIPPED_RECURRING_PAYMENT",
    recurringId: recurring.recurringId,
    expectedOutcome: "DETECT_MISSING_PAYMENT",
    explanation:
      "A scheduled recurring payment has no matching transaction.",
  });

  // 4. Timezone boundary test
  const boundaryDate = boundaryTransaction.transactionDate.slice(0, 10);

  const timezoneTestTransaction = {
    ...boundaryTransaction,
    transactionDate: `${boundaryDate}T23:55:00.000Z`,
    timezone: "Asia/Kolkata",
    isAnomaly: true,
    anomalyType: "TIMEZONE_BOUNDARY",
  };

  anomalyTransactions.push(timezoneTestTransaction);

  const dateParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timezoneTestTransaction.transactionDate));

  const dateValues = Object.fromEntries(
    dateParts.map((part) => [part.type, part.value])
  );

  const localDate =
    `${dateValues.year}-${dateValues.month}-${dateValues.day}`;

  anomalies.push({
    anomalyId: "ANO-0004",
    anomalyType: "TIMEZONE_BOUNDARY",
    transactionId: timezoneTestTransaction.transactionId,
    description: "Transaction close to UTC midnight",
    expectedOutcome: "USE_LOCAL_TRANSACTION_DATE",
  });

  groundTruth.push({
    anomalyId: "ANO-0004",
    anomalyType: "TIMEZONE_BOUNDARY",
    affectedTransactionId: timezoneTestTransaction.transactionId,
    utcDate: timezoneTestTransaction.transactionDate,
    timezone: "Asia/Kolkata",
    expectedLocalDate: localDate,
    expectedOutcome: "USE_LOCAL_TRANSACTION_DATE",
    explanation:
      "Reporting must use the transaction's local timezone.",
  });

  // 5. Invalid budget category
  invalidBudgetCases.push({
    budgetId: "ANOM-BUD-0001",
    userId: recurring.userId,
    categoryId: "CAT-INVALID",
    amount: 5000,
    year: 2026,
    month: 10,
    anomalyType: "INVALID_BUDGET_CATEGORY",
    isAnomaly: true,
  });

  anomalies.push({
    anomalyId: "ANO-0005",
    anomalyType: "INVALID_BUDGET_CATEGORY",
    transactionId: null,
    categoryId: "CAT-INVALID",
    description: "Budget references a nonexistent category",
    expectedOutcome: "REJECT_INVALID_CATEGORY",
  });

  groundTruth.push({
    anomalyId: "ANO-0005",
    anomalyType: "INVALID_BUDGET_CATEGORY",
    categoryId: "CAT-INVALID",
    expectedOutcome: "REJECT_INVALID_CATEGORY",
    explanation: "The referenced category does not exist.",
  });

  console.log(`Anomaly cases prepared: ${anomalies.length}`);
  console.log(
    `Anomaly transaction records: ${anomalyTransactions.length}`
  );
  console.log(
    `Invalid budget cases: ${invalidBudgetCases.length}`
  );

  return {
    anomalies,
    groundTruth,
    anomalyTransactions,
    invalidBudgetCases,
  };
}



// =====================================
// INITIALIZE MASTER DATA
// =====================================




async function main() {
  try {
    // 1. Load and prepare master data
    const masterData = await loadMasterData();

    const preparedAccounts = prepareAccounts(masterData.accounts);

    const lookupMaps = createMasterDataMaps(
      masterData,
      preparedAccounts
    );

    // 2. Generate income transactions
    const regularResult = await generateRegularTransactions(
      masterData,
      lookupMaps
    );

    const accountBalances = regularResult.accountBalances;

    // 3. Generate recurring payments
    const recurringResult = generateRecurringTransactions(
      masterData,
      lookupMaps,
      accountBalances
    );

    const recurringTransactions =
      recurringResult.recurringTransactions;

    const skippedPayments =
      recurringResult.skippedPayments;

    // 4. Calculate required regular expenses
    const regularExpenseCount =
      EXPECTED_TRANSACTION_COUNTS.EXPENSE -
      recurringTransactions.length;

    assert(
      regularExpenseCount >= 0,
      "Recurring transactions exceed the expected expense count"
    );

    console.log(
      `\nGenerating ${regularExpenseCount} regular expenses...`
    );

    for (let i = 0; i < regularExpenseCount; i++) {
      regularResult.createRegularExpense();

      if ((i + 1) % 50000 === 0) {
        console.log(`Generated ${i + 1} regular expenses`);
      }
    }

    // Separate income and regular expenses
    const incomeTransactions =
      regularResult.transactions.filter(
        (item) => item.transactionType === "INCOME"
      );

    const regularExpenses =
      regularResult.transactions.filter(
        (item) => item.transactionType === "EXPENSE"
      );

    // Combine all expense transactions
    const expenseTransactions = [
      ...recurringTransactions,
      ...regularExpenses,
    ];

    // 5. Generate paired transfers
    const transfers = await generateTransfers(
      masterData,
      lookupMaps,
      accountBalances
    );

    // 6. Generate refunds
    const refunds = await generateRefunds(
      expenseTransactions,
      accountBalances
    );

    // 7. Combine all transaction types
    const allTransactions = [
      ...incomeTransactions,
      ...expenseTransactions,
      ...transfers,
      ...refunds,
    ];

    // 8. Verify transaction counts
    const actualCounts = {
      EXPENSE: expenseTransactions.length,
      INCOME: incomeTransactions.length,
      TRANSFER: transfers.length,
      REFUND: refunds.length,
    };

    assert(
      allTransactions.length === TRANSACTION_COUNT,
      `Expected ${TRANSACTION_COUNT} transactions, generated ${allTransactions.length}`
    );

    for (const type of TRANSACTION_TYPES) {
      assert(
        actualCounts[type] === EXPECTED_TRANSACTION_COUNTS[type],
        `Incorrect ${type} count: ${actualCounts[type]}`
      );
    }

    console.log("\nTransaction counts verified:");
    console.log(actualCounts);
    console.log(`Total: ${allTransactions.length}`);

    // 9. Prepare final account balances
    const finalAccounts = preparedAccounts.map((account) => ({
      ...account,
      balance: accountBalances.get(account.accountId),
    }));

    // 10. Validate transfer pairs
    const transferValidation =
      validateTransferPairs(allTransactions);

    // 11. Validate refund relationships
    const refundValidation =
      validateRefundRelationships(allTransactions);

      // 12. Validate recurring relationships
    // 12. Validate recurring relationships
    const recurringValidation =
      validateRecurringRelationships(
        allTransactions,
        skippedPayments,
        masterData,
        lookupMaps
      );

    // 12. Validate account reconciliation
    const reconciliationResult =
      validateAccountReconciliation(
        preparedAccounts,
        allTransactions,
        finalAccounts
      );

    // 13. Prepare labelled anomaly examples
    const anomalyResult = generateAnomalyCases(
      allTransactions,
      masterData
    );
        // 14. Export all generated transactions
    console.log("\nExporting 500000 transactions...");

    await writeCsv(
      path.join(OUTPUT, "transactions_v2.csv"),
      [
        "transactionId",
        "userId",
        "accountId",
        "merchantId",
        "categoryId",
        "amount",
        "transactionType",
        "description",
        "transactionDate",
        "status",
        "transferGroupId",
        "counterpartyAccountId",
        "transferDirection",
        "relatedTransactionId",
        "timezone",
        "recurringId",
        "isAnomaly",
        "anomalyType",
      ],
      allTransactions
    );

    console.log("Transaction CSV export completed.");

    // 14. Export transaction event history
    await writeTransactionEventsCsv(
      path.join(OUTPUT, "transaction_events_v2.csv"),
      allTransactions
    );

    // 15. Export updated accounts
    await writeCsv(
      path.join(OUTPUT, "accounts_v2.csv"),
      [
        "accountId",
        "userId",
        "accountName",
        "accountType",
        "openingBalance",
        "balance",
        "currency",
        "status",
      ],
      finalAccounts
    );

    // 16. Export budgets
    // Export budgets with the correct source amount field
console.log("\nExporting budget records...");

const budgetExportRows = masterData.budgets.map((budget) => ({
  budgetId: budget.budgetId,
  userId: budget.userId,
  categoryId: budget.categoryId,
  amount: budget.budgetAmount,
  year: budget.year,
  month: budget.month,
}));

await writeCsv(
  path.join(OUTPUT, "budgets_v2.csv"),
  ["budgetId", "userId", "categoryId", "amount", "year", "month"],
  budgetExportRows
);

console.log(`Budget records exported: ${budgetExportRows.length}`);

    // 17. Export skipped recurring payments
    await writeCsv(
      path.join(OUTPUT, "skipped_payments.csv"),
      [
        "recurringId",
        "userId",
        "expectedAmount",
        "expectedDate",
        "reason",
      ],
      skippedPayments
    );

    // 18. Export anomaly case descriptions
    await writeCsv(
      path.join(OUTPUT, "anomaly_cases.csv"),
      [
        "anomalyId",
        "anomalyType",
        "transactionId",
        "recurringId",
        "categoryId",
        "description",
        "expectedOutcome",
      ],
      anomalyResult.anomalies
    );

    // 19. Export anomaly transaction records
    await writeCsv(
      path.join(OUTPUT, "anomaly_transactions.csv"),
      [
        "transactionId",
        "userId",
        "accountId",
        "merchantId",
        "categoryId",
        "amount",
        "transactionType",
        "description",
        "transactionDate",
        "status",
        "transferGroupId",
        "counterpartyAccountId",
        "transferDirection",
        "relatedTransactionId",
        "timezone",
        "recurringId",
        "isAnomaly",
        "anomalyType",
      ],
      anomalyResult.anomalyTransactions
    );

    // 20. Export invalid budget test records
    await writeCsv(
      path.join(OUTPUT, "invalid_budget_cases.csv"),
      [
        "budgetId",
        "userId",
        "categoryId",
        "amount",
        "year",
        "month",
        "anomalyType",
        "isAnomaly",
      ],
      anomalyResult.invalidBudgetCases
    );

    // 21. Export ground truth separately
    writeJson(
      path.join(GROUND_TRUTH, "ground_truth.json"),
      anomalyResult.groundTruth
    );

    // 22. Export generation summary
    writeJson(
      path.join(EXPORTS, "generation_summary.json"),
  {
    seed: SEED,
    generatedAt: "2026-10-31T00:00:00.000Z",

    totalTransactions: allTransactions.length,
    transactionCounts: actualCounts,

    skippedRecurringPayments: skippedPayments.length,

    anomalyCases: anomalyResult.anomalies.length,
    groundTruthCases: anomalyResult.groundTruth.length,

    validationResults: {
  transferPairs: transferValidation,
  refunds: refundValidation,
  recurringPayments: recurringValidation,
  accountReconciliation: reconciliationResult,
},

    masterDataCounts: {
      users: masterData.users.length,
      accounts: finalAccounts.length,
      categories: masterData.categories.length,
      merchants: masterData.merchants.length,
      recurringSeries: masterData.recurringSeries.length,
      budgets: masterData.budgets.length,
    },
  }
    );

    console.log("\n====================================");
    console.log("SpendWise V2 generation completed");
    console.log("====================================");

    console.log(`Transactions: ${allTransactions.length}`);
    console.log(`Transfer pairs: ${transferValidation.validatedPairs}`);
    console.log(`Refunds: ${refundValidation.validatedRefunds}`);
    console.log(
      `Reconciled accounts: ${reconciliationResult.reconciledAccounts}`
    );

    console.log(`Output directory: ${OUTPUT}`);
    console.log(`Ground truth directory: ${GROUND_TRUTH}`);
    console.log(`Summary directory: ${EXPORTS}`);

    console.log(
      "\nNote: Final dataset validation and checksum manifest are still pending."
    );

  } catch (error) {
    console.error("\nV2 generator failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

main();


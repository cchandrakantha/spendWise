
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const createRandom = require("../utils/seededRandom");

// -------------------------------------
// CONFIGURATION
// -------------------------------------

const SEED = 20261022;
const USER_COUNT = 1000;
const TRANSACTION_COUNT = 500000;

const random = createRandom(SEED);

const ROOT = path.resolve(__dirname, "../../../data");
const GENERATED = path.join(ROOT, "generated");
const GROUND_TRUTH = path.join(ROOT, "ground_truth");
const EXPORTS = path.join(ROOT, "exports");

for (const folder of [GENERATED, GROUND_TRUTH, EXPORTS]) {
  fs.mkdirSync(folder, { recursive: true });
}

// -------------------------------------
// CSV AND JSON HELPERS
// -------------------------------------

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

function writeCsv(filename, headers, rows) {
  const output = fs.createWriteStream(filename);

  output.write(headers.join(",") + "\n");

  for (const row of rows) {
    const line = headers
      .map((header) => csvEscape(row[header]))
      .join(",");

    output.write(line + "\n");
  }

  return new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
    output.end();
  });
}

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

function randomDate() {
  const start = Date.parse("2025-11-01T00:00:00.000Z");
  const end = Date.parse("2026-10-31T23:59:59.999Z");

  return new Date(random.integer(start, end)).toISOString();
}

// -------------------------------------
// MASTER DATA
// -------------------------------------

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Ishaan",
  "Ananya", "Diya", "Aadhya", "Saanvi", "Meera",
];

const lastNames = [
  "Sharma", "Reddy", "Kumar", "Patel", "Rao",
  "Verma", "Gupta", "Singh", "Joshi", "Naidu",
];

const cities = [
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Pune",
  "Kurnool",
  "Vijayawada",
];

const categoryData = [
  ["CAT-001", "Food", "EXPENSE"],
  ["CAT-002", "Groceries", "EXPENSE"],
  ["CAT-003", "Transport", "EXPENSE"],
  ["CAT-004", "Shopping", "EXPENSE"],
  ["CAT-005", "Utilities", "EXPENSE"],
  ["CAT-006", "Healthcare", "EXPENSE"],
  ["CAT-007", "Entertainment", "EXPENSE"],
  ["CAT-008", "Rent", "EXPENSE"],
  ["CAT-009", "Education", "EXPENSE"],
  ["CAT-010", "Salary", "INCOME"],
  ["CAT-011", "Other Income", "INCOME"],
  ["CAT-012", "Transfers", "TRANSFER"],
];

// Merchant category mappings
const merchants = [
  ["MER-0001", "Amazon", "Shopping", "CAT-004"],
  ["MER-0002", "Flipkart", "Shopping", "CAT-004"],
  ["MER-0003", "Swiggy", "Food", "CAT-001"],
  ["MER-0004", "Zomato", "Food", "CAT-001"],
  ["MER-0005", "Uber", "Transport", "CAT-003"],
  ["MER-0006", "Ola", "Transport", "CAT-003"],
  ["MER-0007", "Airtel", "Utilities", "CAT-005"],
  ["MER-0008", "Netflix", "Entertainment", "CAT-007"],
  ["MER-0009", "DMart", "Groceries", "CAT-002"],
  ["MER-0010", "Apollo Pharmacy", "Healthcare", "CAT-006"],
  ["MER-0011", "House Rent", "Rent", "CAT-008"],
  ["MER-0012", "Employer Payroll", "Salary", "CAT-010"],
];

// -------------------------------------
// MAIN GENERATOR
// -------------------------------------

async function generate() {
  console.log("====================================");
  console.log("Starting SpendWise Dataset Generator");
  console.log(`Seed: ${SEED}`);
  console.log("====================================");

  // 1. USERS

  const users = [];

  for (let i = 1; i <= USER_COUNT; i++) {
    const firstName = random.pick(firstNames);
    const lastName = random.pick(lastNames);

    users.push({
      userId: createId("USR", i),
      fullName: `${firstName} ${lastName}`,
      email: `user${String(i).padStart(6, "0")}@example.com`,
      city: random.pick(cities),
      householdSize: random.integer(1, 6),
      monthlyIncome: random.integer(20000, 200000),
      profileStatus: "ACTIVE",
    });
  }

  // 2. ACCOUNTS

  const accounts = [];
  const accountsByUser = new Map();

  for (const user of users) {
    const accountCount = random.integer(1, 3);
    const userAccounts = [];

    for (let i = 1; i <= accountCount; i++) {
      const account = {
        accountId: `ACC-${user.userId}-${String(i).padStart(2, "0")}`,
        userId: user.userId,
        accountName: `Account ${i}`,
        accountType: random.pick([
          "SAVINGS",
          "CURRENT",
          "CREDIT_CARD",
          "WALLET",
          "CASH",
        ]),
        balance: random.integer(1000, 500000),
        currency: "INR",
        status: "ACTIVE",
      };

      accounts.push(account);
      userAccounts.push(account);
    }

    accountsByUser.set(user.userId, userAccounts);
  }

  // 3. CATEGORIES

  const categories = categoryData.map(
    ([categoryId, categoryName, categoryType]) => ({
      categoryId,
      categoryName,
      categoryType,
      isActive: true,
    })
  );

  const categoryMap = new Map(
    categories.map((category) => [
      category.categoryId,
      category,
    ])
  );

  // 4. MERCHANTS

  const merchantRows = merchants.map(
    ([merchantId, merchantName, merchantType, categoryId]) => ({
      merchantId,
      merchantName,
      merchantType,
      categoryId,
      city: random.pick(cities),
      isActive: true,
    })
  );

  // 5. TRANSACTIONS

  const transactionRows = [];

  for (let i = 1; i <= TRANSACTION_COUNT; i++) {
    const user = random.pick(users);

    const userAccounts = accountsByUser.get(user.userId);
    const account = random.pick(userAccounts);

    const merchant = random.pick(merchantRows);
    const category = categoryMap.get(merchant.categoryId);

    if (!category) {
      throw new Error(
        `Invalid category mapping for merchant ${merchant.merchantId}`
      );
    }

    const transactionType = category.categoryType;

    const amount = random.integer(
      transactionType === "INCOME" ? 15000 : 50,
      transactionType === "INCOME" ? 200000 : 25000
    );

    transactionRows.push({
      transactionId: `TXN-2026-${String(i).padStart(8, "0")}`,
      userId: user.userId,
      accountId: account.accountId,
      merchantId: merchant.merchantId,
      categoryId: category.categoryId,
      amount,
      transactionType,
      description: `${merchant.merchantName} payment`,
      transactionDate: randomDate(),
      status: "COMPLETED",
      isAnomaly: false,
      anomalyType: null,
    });

    if (i % 100000 === 0) {
      console.log(`Generated ${i.toLocaleString("en-IN")} transactions`);
    }
  }

  // -------------------------------------
  // EXPORT CSV FILES
  // -------------------------------------

  console.log("Exporting CSV files...");

  await writeCsv(
    path.join(GENERATED, "user_profiles.csv"),
    Object.keys(users[0]),
    users
  );

  await writeCsv(
    path.join(GENERATED, "accounts.csv"),
    Object.keys(accounts[0]),
    accounts
  );

  await writeCsv(
    path.join(GENERATED, "categories.csv"),
    Object.keys(categories[0]),
    categories
  );

  await writeCsv(
    path.join(GENERATED, "merchants.csv"),
    Object.keys(merchantRows[0]),
    merchantRows
  );

  await writeCsv(
    path.join(GENERATED, "transactions.csv"),
    Object.keys(transactionRows[0]),
    transactionRows
  );

  // -------------------------------------
  // EXPORT MASTER JSON
  // -------------------------------------

  console.log("Exporting master JSON...");

  writeJson(
    path.join(EXPORTS, "master_data.json"),
    {
      seed: SEED,
      users,
      accounts,
      categories,
      merchants: merchantRows,
    }
  );

  // -------------------------------------
  // GROUND TRUTH
  // -------------------------------------

  writeJson(
    path.join(GROUND_TRUTH, "ground_truth.json"),
    {
      seed: SEED,
      transactionCount: TRANSACTION_COUNT,
      labelledAnomalies: [],
      note: "Baseline dataset. Labelled edge cases will be added separately.",
    }
  );

  // -------------------------------------
  // MANIFEST AND CHECKSUMS
  // -------------------------------------

  console.log("Generating SHA-256 checksums...");

  const files = [
    "user_profiles.csv",
    "accounts.csv",
    "categories.csv",
    "merchants.csv",
    "transactions.csv",
  ];

  const manifest = {
    application: "SpendWise",
    seed: SEED,
    period: {
      start: "2025-11-01",
      end: "2026-10-31",
    },
    userCount: users.length,
    accountCount: accounts.length,
    merchantCount: merchantRows.length,
    categoryCount: categories.length,
    transactionCount: transactionRows.length,
    files: {},
  };

  for (const filename of files) {
    const filePath = path.join(GENERATED, filename);

    const checksum = crypto
      .createHash("sha256")
      .update(fs.readFileSync(filePath))
      .digest("hex");

    manifest.files[filename] = {
      sha256: checksum,
    };
  }

  writeJson(
    path.join(EXPORTS, "manifest.json"),
    manifest
  );

  // -------------------------------------
  // SUMMARY
  // -------------------------------------

  console.log("====================================");
  console.log("SpendWise Dataset Generated!");
  console.log("====================================");
  console.log(`Users: ${users.length}`);
  console.log(`Accounts: ${accounts.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Merchants: ${merchantRows.length}`);
  console.log(`Transactions: ${transactionRows.length}`);
  console.log("Period: November 2025 - October 2026");
  console.log(`Seed: ${SEED}`);
  console.log("====================================");
}

generate().catch((error) => {
  console.error("Dataset generation failed:", error);
  process.exit(1);
});


const fs = require("fs");
const path = require("path");
const createRandom = require("../utils/seededRandom");

const SEED = 20261022;
const random = createRandom(SEED);

const ROOT = path.resolve(__dirname, "../../../data");
const GENERATED = path.join(ROOT, "generated");

const USERS_FILE = path.join(GENERATED, "user_profiles.csv");
const OUTPUT_FILE = path.join(GENERATED, "recurring_series.csv");

const recurringMerchants = [
  {
    merchantId: "MER-0007",
    recurringName: "Mobile Recharge",
    categoryId: "CAT-005",
    minAmount: 299,
    maxAmount: 999,
    frequency: "MONTHLY",
  },
  {
    merchantId: "MER-0008",
    recurringName: "Netflix Subscription",
    categoryId: "CAT-007",
    minAmount: 149,
    maxAmount: 649,
    frequency: "MONTHLY",
  },
  {
    merchantId: "MER-0011",
    recurringName: "Monthly Rent",
    categoryId: "CAT-008",
    minAmount: 5000,
    maxAmount: 25000,
    frequency: "MONTHLY",
  },
  {
    merchantId: "MER-0007",
    recurringName: "Internet Bill",
    categoryId: "CAT-005",
    minAmount: 500,
    maxAmount: 1500,
    frequency: "MONTHLY",
  },
];

function csvEscape(value) {
  if (value === null || value === undefined) return "";

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function parseCsvLine(line) {
  const values = [];
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
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    throw new Error("user_profiles.csv not found. Run npm run generate:data first.");
  }

  const content = fs.readFileSync(USERS_FILE, "utf8").trim();

  if (!content) {
    throw new Error("user_profiles.csv is empty.");
  }

  const lines = content.split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const userIdIndex = headers.indexOf("userId");

  if (userIdIndex === -1) {
    throw new Error("userId column is missing.");
  }

  return lines.slice(1).filter(Boolean).map((line) => {
    return parseCsvLine(line)[userIdIndex];
  });
}

function generateRecurring() {
  console.log("Starting SpendWise recurring payment generation...");
  console.log(`Seed: ${SEED}`);

  const users = loadUsers();

  if (users.length !== 1000) {
    throw new Error(`Expected 1000 users, found ${users.length}.`);
  }

  const recurringRows = [];
  let id = 1;

  for (const userId of users) {
    for (const merchant of recurringMerchants) {
      recurringRows.push({
        recurringId: `REC-${String(id++).padStart(6, "0")}`,
        userId,
        merchantId: merchant.merchantId,
        categoryId: merchant.categoryId,
        recurringName: merchant.recurringName,
        expectedAmount: random.integer(
          merchant.minAmount,
          merchant.maxAmount
        ),
        frequency: merchant.frequency,
        startDate: "2025-11-01",
        nextExpectedDate: "2026-11-01",
        status: "ACTIVE",
      });
    }
  }

  const headers = [
    "recurringId",
    "userId",
    "merchantId",
    "categoryId",
    "recurringName",
    "expectedAmount",
    "frequency",
    "startDate",
    "nextExpectedDate",
    "status",
  ];

  const output = [
    headers.join(","),
    ...recurringRows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(",")
    ),
  ].join("\n");

  fs.mkdirSync(GENERATED, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, output + "\n", "utf8");

  console.log("--------------------------------");
  console.log("Recurring generation completed!");
  console.log(`Users: ${users.length}`);
  console.log(`Recurring types per user: ${recurringMerchants.length}`);
  console.log(`Total recurring series: ${recurringRows.length}`);
  console.log("--------------------------------");
}

try {
  generateRecurring();
} catch (error) {
  console.error("Recurring generation failed:", error.message);
  process.exit(1);
}

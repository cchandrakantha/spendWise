
const fs = require("fs");
const path = require("path");
const createRandom = require("../utils/seededRandom");

const SEED = 20261022;
const random = createRandom(SEED);

const ROOT = path.resolve(__dirname, "../../../data");
const GENERATED = path.join(ROOT, "generated");

const USERS_FILE = path.join(GENERATED, "user_profiles.csv");
const OUTPUT_FILE = path.join(GENERATED, "budgets.csv");

const expenseCategories = [
  { categoryId: "CAT-001", code: "FOOD", min: 3000, max: 12000 },
  { categoryId: "CAT-002", code: "GROC", min: 4000, max: 15000 },
  { categoryId: "CAT-003", code: "TRAN", min: 1500, max: 8000 },
  { categoryId: "CAT-004", code: "SHOP", min: 2000, max: 12000 },
  { categoryId: "CAT-005", code: "UTIL", min: 1000, max: 6000 },
  { categoryId: "CAT-006", code: "HLTH", min: 1000, max: 8000 },
  { categoryId: "CAT-007", code: "ENT", min: 1000, max: 7000 },
  { categoryId: "CAT-008", code: "RENT", min: 5000, max: 30000 },
  { categoryId: "CAT-009", code: "EDU", min: 1000, max: 15000 },
];

const months = [];

for (let year = 2025, month = 11; months.length < 12;) {
  months.push({ year, month });

  month++;

  if (month > 12) {
    month = 1;
    year++;
  }
}

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

function generateBudgets() {
  console.log("Starting SpendWise budget generation...");
  console.log(`Seed: ${SEED}`);

  const users = loadUsers();

  if (users.length !== 1000) {
    throw new Error(`Expected 1000 users, found ${users.length}.`);
  }

  const budgets = [];

  for (const userId of users) {
    for (const { year, month } of months) {
      for (const category of expenseCategories) {
        budgets.push({
          budgetId: `BUD-${userId}-${year}-${String(month).padStart(2, "0")}-${category.code}`,
          userId,
          categoryId: category.categoryId,
          year,
          month,
          budgetAmount: random.integer(category.min, category.max),
          status: "ACTIVE",
        });
      }
    }
  }

  const headers = [
    "budgetId",
    "userId",
    "categoryId",
    "year",
    "month",
    "budgetAmount",
    "status",
  ];

  const output = [
    headers.join(","),
    ...budgets.map((budget) =>
      headers.map((header) => csvEscape(budget[header])).join(",")
    ),
  ].join("\n");

  fs.mkdirSync(GENERATED, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, output + "\n", "utf8");

  console.log("--------------------------------");
  console.log("Budget generation completed!");
  console.log(`Users: ${users.length}`);
  console.log(`Categories: ${expenseCategories.length}`);
  console.log(`Months: ${months.length}`);
  console.log(`Total budgets: ${budgets.length}`);
  console.log("--------------------------------");
}

try {
  generateBudgets();
} catch (error) {
  console.error("Budget generation failed:", error.message);
  process.exit(1);
}

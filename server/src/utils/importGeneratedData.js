
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Op } = require("sequelize");

require("dotenv").config();

const sequelize = require("../config/database");

const {
  UserProfile,
  Account,
  Merchant,
  Category,
  Transaction,
  Budget,
  RecurringSeries,
} = require("../models");

const DATA_DIR = path.resolve(__dirname, "../../../data/generated");
const BATCH_SIZE = 1000;

function parseBoolean(value) {
  return ["true", "1", "yes"].includes(
    String(value).trim().toLowerCase()
  );
}

async function importCsv(fileName, Model, primaryKey, mapper) {
  const filePath = path.join(DATA_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  let batch = [];
  let processed = 0;
  let inserted = 0;
  let skipped = 0;

  async function flushBatch() {
    if (batch.length === 0) return;

    const ids = batch.map((record) => record[primaryKey]);

    const existing = await Model.findAll({
      attributes: [primaryKey],
      where: {
        [primaryKey]: { [Op.in]: ids },
      },
      raw: true,
    });

    const existingIds = new Set(
      existing.map((record) => String(record[primaryKey]))
    );

    const newRecords = batch.filter(
      (record) => !existingIds.has(String(record[primaryKey]))
    );

    if (newRecords.length > 0) {
      await Model.bulkCreate(newRecords, {
        validate: true,
        individualHooks: false,
      });

      inserted += newRecords.length;
    }

    skipped += batch.length - newRecords.length;
    batch = [];
  }

  console.log(`\nImporting ${fileName}...`);

  const stream = fs.createReadStream(filePath).pipe(csv());

  for await (const row of stream) {
    batch.push(mapper(row));
    processed++;

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();

      if (processed % 10000 === 0) {
        console.log(`Processed ${processed} rows...`);
      }
    }
  }

  await flushBatch();

  console.log(
    `${fileName}: processed=${processed}, inserted=${inserted}, skipped=${skipped}`
  );

  return { fileName, processed, inserted, skipped };
}

async function main() {
  const results = [];

  try {
    await sequelize.authenticate();

    console.log("Connected to SpendWise MySQL database.");
    console.log(`Dataset: ${DATA_DIR}`);
    console.log(`Batch size: ${BATCH_SIZE}`);

    // 1. Categories
    results.push(
      await importCsv("categories.csv", Category, "categoryId", (row) => ({
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryType: row.categoryType,
        isActive: parseBoolean(row.isActive),
      }))
    );

    // 2. User profiles
    results.push(
      await importCsv(
        "user_profiles.csv",
        UserProfile,
        "userId",
        (row) => ({
          userId: row.userId,
          fullName: row.fullName,
          email: row.email,
          city: row.city,
          householdSize: Number(row.householdSize),
          monthlyIncome: row.monthlyIncome,
          profileStatus: row.profileStatus,
        })
      )
    );

    // 3. Merchants
    results.push(
      await importCsv("merchants.csv", Merchant, "merchantId", (row) => ({
        merchantId: row.merchantId,
        merchantName: row.merchantName,
        merchantType: row.merchantType,
        categoryId: row.categoryId || null,
        city: row.city,
        isActive: parseBoolean(row.isActive),
      }))
    );

    // 4. Accounts
    results.push(
      await importCsv("accounts.csv", Account, "accountId", (row) => ({
        accountId: row.accountId,
        userId: row.userId,
        accountName: row.accountName,
        accountType: row.accountType,
        balance: row.balance,
        currency: row.currency || "INR",
        status: row.status,
      }))
    );

    // 5. Recurring series
    results.push(
      await importCsv(
        "recurring_series.csv",
        RecurringSeries,
        "recurringId",
        (row) => ({
          recurringId: row.recurringId,
          userId: row.userId,
          merchantId: row.merchantId || null,
          categoryId: row.categoryId || null,
          recurringName: row.recurringName,
          expectedAmount: row.expectedAmount,
          frequency: row.frequency,
          startDate: row.startDate,
          nextExpectedDate: row.nextExpectedDate || null,
          status: row.status,
        })
      )
    );

    // 6. Budgets
    results.push(
      await importCsv("budgets.csv", Budget, "budgetId", (row) => ({
        budgetId: row.budgetId,
        userId: row.userId,
        categoryId: row.categoryId,
        year: Number(row.year),
        month: Number(row.month),
        budgetAmount: row.budgetAmount,
        status: row.status,
      }))
    );

    // 7. Transactions
    results.push(
      await importCsv(
        "transactions.csv",
        Transaction,
        "transactionId",
        (row) => ({
          transactionId: row.transactionId,
          userId: row.userId,
          accountId: row.accountId,
          merchantId: row.merchantId || null,
          categoryId: row.categoryId || null,
          amount: row.amount,
          transactionType: row.transactionType,
          description: row.description,
          transactionDate: new Date(row.transactionDate),
          status: row.status,
          isAnomaly: parseBoolean(row.isAnomaly),
          anomalyType: row.anomalyType || null,
        })
      )
    );

    console.log("\n========== IMPORT SUMMARY ==========");

    for (const result of results) {
      console.log(
        `${result.fileName}: inserted=${result.inserted}, skipped=${result.skipped}, processed=${result.processed}`
      );
    }

    console.log("\nAll CSV imports completed successfully.");
  } catch (error) {
    console.error("\nIMPORT FAILED:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();

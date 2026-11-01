const UserProfile = require("./UserProfile");
const Account = require("./Account");
const Merchant = require("./Merchant");
const Category = require("./Category");
const Transaction = require("./Transaction");
const CategoryRule = require("./CategoryRule");
const Budget = require("./Budget");
const RecurringSeries = require("./RecurringSeries");
const Insight = require("./Insight");
const TransactionEvent = require("./TransactionEvent");

// UserProfile relationships
UserProfile.hasMany(Account, { foreignKey: "userId" });
Account.belongsTo(UserProfile, { foreignKey: "userId" });

UserProfile.hasMany(Transaction, { foreignKey: "userId" });
Transaction.belongsTo(UserProfile, { foreignKey: "userId" });
Transaction.belongsTo(Category, { foreignKey: "categoryId" });

UserProfile.hasMany(Budget, { foreignKey: "userId" });
Budget.belongsTo(UserProfile, { foreignKey: "userId" });

UserProfile.hasMany(RecurringSeries, { foreignKey: "userId" });
RecurringSeries.belongsTo(UserProfile, { foreignKey: "userId" });

UserProfile.hasMany(Insight, { foreignKey: "userId" });
Insight.belongsTo(UserProfile, { foreignKey: "userId" });

// Account relationships
Account.hasMany(Transaction, { foreignKey: "accountId" });
Transaction.belongsTo(Account, { foreignKey: "accountId" });

// Transfer counterparty account relationship
Account.hasMany(Transaction, {
  foreignKey: "counterpartyAccountId",
  as: "counterpartyTransactions",
});

Transaction.belongsTo(Account, {
  foreignKey: "counterpartyAccountId",
  as: "counterpartyAccount",
});

// Merchant relationships
Merchant.hasMany(Transaction, { foreignKey: "merchantId" });
Transaction.belongsTo(Merchant, { foreignKey: "merchantId" });

Merchant.hasMany(RecurringSeries, { foreignKey: "merchantId" });
RecurringSeries.belongsTo(Merchant, { foreignKey: "merchantId" });

Merchant.belongsTo(Category, { foreignKey: "categoryId" });
Category.hasMany(Merchant, { foreignKey: "categoryId" });

// Recurring series relationships
RecurringSeries.hasMany(Transaction, {
  foreignKey: "recurringId",
  as: "transactions",
});

Transaction.belongsTo(RecurringSeries, {
  foreignKey: "recurringId",
  as: "recurringSeries",
});

// Category relationships
Category.hasMany(Budget, {
  foreignKey: "categoryId",
  as: "budgets",
});

Budget.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});
Category.hasMany(CategoryRule, { foreignKey: "categoryId" });
CategoryRule.belongsTo(Category, { foreignKey: "categoryId" });

Category.hasMany(Budget, { foreignKey: "categoryId" });
Budget.belongsTo(Category, { foreignKey: "categoryId" });

Category.hasMany(RecurringSeries, { foreignKey: "categoryId" });
RecurringSeries.belongsTo(Category, { foreignKey: "categoryId" });

// Transaction-to-transaction relationship (refunds)
Transaction.hasMany(Transaction, {
  foreignKey: "relatedTransactionId",
  as: "refundTransactions",
});

Transaction.belongsTo(Transaction, {
  foreignKey: "relatedTransactionId",
  as: "originalTransaction",
});

// Transaction event relationships
Transaction.hasMany(TransactionEvent, { foreignKey: "transactionId" });
TransactionEvent.belongsTo(Transaction, { foreignKey: "transactionId" });

module.exports = {
  UserProfile,
  Account,
  Merchant,
  Category,
  Transaction,
  CategoryRule,
  Budget,
  RecurringSeries,
  Insight,
  TransactionEvent,
};
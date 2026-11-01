import api from "./api";

// Create a new transaction
export const createTransaction = async (transactionData) => {
  const response = await api.post("/transactions", transactionData);
  return response.data;
};

// Get all transactions
export const getTransactions = async (params = {}) => {
  const response = await api.get("/transactions", { params });
  return response.data;
};

// Get transaction summary
export const getTransactionSummary = async () => {
  const response = await api.get("/transactions/summary");
  return response.data;
};

// Get a transaction by ID
export const getTransactionById = async (id) => {
  const response = await api.get(`/transactions/${id}`);
  return response.data;
};
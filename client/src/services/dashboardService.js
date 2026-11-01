
import api from "./api";

export const getDashboard = async () => {
  const response = await api.get("/dashboard");
  return response.data.dashboard;
};

export const getTransactions = async (params = {}) => {
  const response = await api.get("/transactions", { params });
  return response.data;
};

export const getTransactionSummary = async () => {
  const response = await api.get("/transactions/summary");
  return response.data;
};

export const getBudgetOverview = async (year, month) => {
  const response = await api.get("/budgets/overview", {
    params: { year, month },
  });
  return response.data;
};

export const getCategorySummary = async () => {
  const response = await api.get("/categories/summary");
  return response.data;
};

export const getRecurringSummary = async () => {
  const response = await api.get("/recurring/summary");
  return response.data;
};

export const getInsights = async () => {
  const response = await api.get("/insights");
  return response.data;
};


import api from "./api";

export const getBudgets = async (params = {}) => {
  const response = await api.get("/budgets", { params });
  return response.data;
};

export const getBudgetOverview = async (year, month) => {
  const response = await api.get("/budgets/overview", {
    params: { year, month },
  });
  return response.data;
};

export const createBudget = async (budgetData) => {
  const response = await api.post("/budgets", budgetData);
  return response.data;
};

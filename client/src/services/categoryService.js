import api from "./api";

export const getCategories = async () => {
  const response = await api.get("/categories");
  return response.data;
};

export const getCategorySummary = async () => {
  const response = await api.get("/categories/summary");
  return response.data;
};

export const getCategoryById = async (id) => {
  const response = await api.get(`/categories/${id}`);
  return response.data;
};

export const getCategoryTransactions = async (id, params = {}) => {
  const response = await api.get(`/categories/${id}/transactions`, {
    params,
  });
  return response.data;
};

import api from "./api";

export const getRecurringPayments = async (params = {}) => {
  const response = await api.get("/recurring", { params });
  return response.data;
};

export const getRecurringSummary = async () => {
  const response = await api.get("/recurring/summary");
  return response.data;
};

export const getRecurringPaymentById = async (id) => {
  const response = await api.get(`/recurring/${id}`);
  return response.data;
};

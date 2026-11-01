import api from "./api";

export const getInsights = async () => {
  const response = await api.get("/insights");
  return response.data;
};
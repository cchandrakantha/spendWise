
import api from "./api";

export const getAccounts = async () => {
  const response = await api.get("/accounts");
  return response.data;
};

export const createAccount = async (accountData) => {
  const response = await api.post("/accounts", accountData);
  return response.data;
};

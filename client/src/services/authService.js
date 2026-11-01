
import api from "./api";

export const signup = async (userData) => {
  const response = await api.post("/auth/signup", userData);

  if (response.data.token) {
    localStorage.setItem("spendwise_token", response.data.token);
  }

  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials);

  if (response.data.token) {
    localStorage.setItem("spendwise_token", response.data.token);
  }

  return response.data;
};

export const logout = () => {
  localStorage.removeItem("spendwise_token");
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

import { apiService } from "./api.services";

export const login = async (payload: any) => {
  return apiService.post("method/lms.lms.lms_login.login", payload);
};

export const signup = async (payload: any) => {
  return apiService.post("method/lms.lms.lms_login.signup", payload);
};

export const logout = async () => {
  return apiService.post("method/lms.lms.lms_login.logout", {});
};

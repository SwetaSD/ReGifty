export const validateName = (name) => {
  return /^[\p{L}][\p{L}\s.'-]{1,49}$/u.test(name.trim());
};

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
};

export const validatePhone = (phone) => {
  return /^[6-9]\d{9}$/.test(phone);
};

export const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};
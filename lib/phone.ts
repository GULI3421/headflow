export function validatePhone(value: string) {
  const phone = value.trim();
  if (!phone) return "Укажите номер телефона.";
  if (!/^\+?[0-9\s()-]+$/.test(phone)) {
    return "Используйте только цифры, ведущий «+», пробелы, дефисы и скобки.";
  }

  const compactPhone = phone.replace(/[\s()-]/g, "");
  const digits = compactPhone.startsWith("+") ? compactPhone.slice(1) : compactPhone;
  if (digits.startsWith("0")) {
    return "Укажите номер с кодом страны, например +996... или 996..., без начального 0.";
  }
  if (digits.length < 8) return "Введите не менее 8 цифр.";
  if (digits.length > 15) return "Введите не более 15 цифр.";

  return "";
}

export function normalizePhone(value: string) {
  const compactPhone = value.trim().replace(/[\s()-]/g, "");
  const digits = compactPhone.startsWith("+") ? compactPhone.slice(1) : compactPhone;
  if (digits.startsWith("996")) return `+${digits}`;
  return compactPhone;
}

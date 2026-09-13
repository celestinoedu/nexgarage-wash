/** Utilidades de CPF usadas no cadastro do usuário. */

export const cpfDigits = (value: string) => value.replace(/[^0-9]/g, "");

export function formatCPF(value: string) {
  const digits = cpfDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Confere os dois dígitos verificadores, para não gravar CPF inexistente. */
export function isValidCPF(value: string) {
  const digits = cpfDigits(value);
  if (digits.length !== 11) return false;
  if (new Set(digits).size === 1) return false; // 000…, 111… não são válidos
  for (const length of [9, 10]) {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(digits[length])) return false;
  }
  return true;
}

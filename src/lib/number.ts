export const normalizeNumberInput = (value: string) => {
  return value.replace(/[^0-9]/g, '');
};

export const formatNumberInput = (value: string) => {
  const digits = normalizeNumberInput(value);
  if (digits === '') return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseNumberInput = (value: string) => {
  const digits = normalizeNumberInput(value);
  if (digits === '') return 0;
  return parseFloat(digits);
};

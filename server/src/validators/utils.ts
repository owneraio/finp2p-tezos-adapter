export const messages = {
  shouldBeString: 'Should be a string.',
  shouldBeNum: 'Should be an integer number, higher than 0.',
  shouldBeStrNum: 'Should be a stringified integer number, higher than 0.',
};

export const isStrPositiveInt = (value: string) => {
  const v = Number(value);
  return !!v && Number.isInteger(v) && v > 0;
};

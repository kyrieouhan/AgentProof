export function createCounter(initial = 0) {
  let value = Number(initial) || 0;
  return {
    increment() {
      value += 1;
      return value;
    },
    value() {
      return value;
    }
  };
}

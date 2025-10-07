// Re-usable rule functions for basic stuff.
// I.e. copy, accumulate, save as number, save as array, save as this, save as that.
function copy({ parser = (v) => v, destinationKey } = {}) {
  return ({ output, key, value }) => {
    output[destinationKey || key] = parser(value);
  };
}

export { copy };

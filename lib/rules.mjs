import pathToNestedObj from 'path-to-nested-obj';
import deepMerge from '@rubicon2/deep-merge';

// Re-usable rule functions for basic stuff.
// Avoiding a default export allows the freedom to write more standard rules as ideas pop up.
// But right now can't think of any.
function copy({
  parser = (v) => v,
  destinationKey,
  conflictHandler = (a, b) => b,
  options = {},
} = {}) {
  return ({ output, key, value, options: transformerOptions }) => {
    // Merge options provided in arguments, with local overrides which are
    // provided and locked in when this anonymous function is instantiated.
    const allOptions = {
      ...transformerOptions,
      ...options,
    };
    const { pathSeparator } = allOptions;
    const obj = pathToNestedObj(
      destinationKey || key,
      pathSeparator,
      parser(value),
    );
    const rootKey = destinationKey
      ? destinationKey.split(pathSeparator)[0]
      : key.split(pathSeparator)[0];
    // Merge deeply with any existing values, but at the deepest level use conflict handler function to resolve.
    output[rootKey] = deepMerge(output[rootKey], obj[rootKey], conflictHandler);
  };
}

export { copy };

import pathToNestedObj from 'path-to-nested-obj';
import deepMerge from '@rubicon2/deep-merge';

// Re-usable rule functions for basic stuff.
// I.e. copy, accumulate, save as number, save as array, save as this, save as that.
function copy({
  parser = (v) => v,
  destinationKey,
  conflictHandler = (a, b) => b,
} = {}) {
  return ({ output, key, value, options }) => {
    const obj = pathToNestedObj(
      destinationKey || key,
      options.pathSeparator,
      parser(value),
    );
    const rootKey = destinationKey
      ? destinationKey.split(options.pathSeparator)[0]
      : key.split(options.pathSeparator)[0];
    // Merge deeply with any existing values, but at the deepest level use conflict handler function to resolve.
    output[rootKey] = deepMerge(output[rootKey], obj[rootKey], conflictHandler);
  };
}

export { copy };

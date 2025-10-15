import pathToNestedObj from 'path-to-nested-obj';
import deepMerge from '@rubicon2/deep-merge';

// Re-usable rule functions for basic stuff.
// Avoiding a default export allows the freedom to write more standard rules as ideas pop up.
// But right now can't think of any.

// Create local typedefs out of imports to avoid the end-user seeing the import path instead of just the typedef name.
/** @typedef {import('./jsdoc.common.mjs').options} options */
/** @typedef {import('./jsdoc.common.mjs').rule} rule */

/**
 * @callback parser
 * @param {*} value - Input value, of any type.
 * @returns {*} Output value, of any type.
 */

/**
 * @callback conflictHandler
 * @param {*} a - The first value assigned to this key.
 * @param {*} b - The second value assigned to this key.
 * @returns {*} Returns a or b.
 */

/**
 * @typedef {object} copyParams
 * @property {parser} [parser] - Optional function to process the input value before assigning to the output key. Can also be used to construct an object for the value to reside in, before being assigned to the output key.
 * @property {string} [destinationKey] - The key path on the output object which will contain the value once it has been processed by the parser. This can be a nested path, with each path segment separated by default with a dot.
 * @property {conflictHandler} [conflictHandler] - This will be called if there are two non-object values assigned to the same key. By default, deep-merge puts the values into an array.
 * @property {options} [options] - This can be used to override any options provided by the transformer when it calls the copy rule.
 */

/**
 * Create a rule function that copies an input value, parses it with an optional parser, and then puts the result on the output object at a key path determined by the user-provided destinationKey. If there is no destinationKey it will copy to the same path as the input key.
 * @param {copyParams} params - The params object can include the optional properties: parser, destinationKey, conflictHandler, and options.
 * @returns {rule} Return a rule function for use on the rules object when initializing a transformer.
 */
function copy({
  parser = (v) => v,
  destinationKey,
  conflictHandler,
  options = {},
} = {}) {
  return ({ output, key, value, options: transformerOptions }) => {
    // Merge options provided in arguments, with local overrides which are
    // provided and locked in when this anonymous function is instantiated.
    /** @type {options} */
    const allOptions = {
      ...transformerOptions,
      ...options,
    };
    const { pathSeparator, nestedOutputKeys, omitEmptyStrings } = allOptions;

    if (typeof value === 'string' && value.length === 0 && omitEmptyStrings)
      return;

    if (nestedOutputKeys) {
      const obj = pathToNestedObj(
        destinationKey || key,
        pathSeparator,
        parser(value),
      );
      const rootKey = destinationKey
        ? destinationKey.split(pathSeparator)[0]
        : key.split(pathSeparator)[0];
      // Merge deeply with any existing values, but at the deepest level use conflict handler function to resolve.
      output[rootKey] = deepMerge(
        output[rootKey],
        obj[rootKey],
        conflictHandler,
      );
    } else {
      output[destinationKey || key] = parser(value);
    }
  };
}

export { copy };

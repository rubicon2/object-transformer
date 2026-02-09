import type { StringKeyObj } from './common.mjs';
import type { Options } from './options.mjs';
import type { Parser } from './parsers.mjs';
import pathToNestedObj from 'path-to-nested-obj';
import deepMerge from '@rubicon2/deep-merge';

/**
 * Parameters passed to each transformer rule.
 * @interface
 * @param {StringKeyObj<any>} input - The input object.
 * @param {StringKeyObj<any>} output - The output object.
 * @param {string} key - The input key path.
 * @param {*} value - The value retrieved from the input object with the input key path.
 * @param {Options} options - The options object as determined when the transformer was instantiated.
 */
export interface RuleParams {
  input: StringKeyObj<any>;
  output: StringKeyObj<any>;
  key: string;
  value: any;
  options: Options;
}

/**
 * The function signature for a rule function.
 * @interface
 */
export interface Rule {
  (params: RuleParams): void;
}

/**
 * @interface
 * @param {*} a - The first value assigned to this key.
 * @param {*} b - The second value assigned to this key.
 * @returns {*} Returns a or b.
 */
type ConflictHandler = (a: any, b: any) => any;

/**
 * @interface
 * @property {Parser} [parser] - Optional function to process the input value before assigning to the output key. Can also be used to construct an object for the value to reside in, before being assigned to the output key.
 * @property {string} [destinationKey] - The key path on the output object which will contain the value once it has been processed by the parser. This can be a nested path, with each path segment separated by default with a dot.
 * @property {string} [key] - Synonym of destinationKey. Specifies the key path on the output object which will contain the value once it has been processed by the parser. This can be a nested path, with each path segment separated by default with a dot.
 * @property {ConflictHandler} [conflictHandler] - This will be called if there are two non-object values assigned to the same key. By default, deep-merge puts the values into an array.
 * @property {Options} [options] - This can be used to override any options provided by the transformer when it calls the copy rule.
 */
interface CopyParams {
  parser?: Parser;
  destinationKey?: string;
  key?: string;
  conflictHandler?: ConflictHandler;
  options?: Options;
}

/**
 * Create a rule function that copies an input value, parses it with an optional parser, and then puts the result on the output object at a key path determined by the user-provided destinationKey. If there is no destinationKey it will copy to the same path as the input key.
 * @param {CopyParams} params - The params object can include the optional properties: parser, destinationKey, conflictHandler, and options.
 * @returns {Rule} Return a rule function for use on the rules object when initializing a transformer.
 */
function copy({
  parser = (v) => v,
  destinationKey,
  // Synonym for destinationKey. Leaving destinationKey in to not break existing tests/code.
  key,
  conflictHandler,
  options = {},
}: CopyParams = {}): Rule {
  // If destinationKey is set, use that, but otherwise use key.
  if (!destinationKey) destinationKey = key;

  return ({
    output,
    key: inputKey,
    value,
    options: transformerOptions,
  }: RuleParams) => {
    // Merge options provided in arguments, with local overrides which are
    // provided and locked in when this anonymous function is instantiated.
    const allOptions: Options = {
      ...transformerOptions, // Transformer-wide options.
      ...options, // Rule-specific options.
    };
    let { pathSeparator, nestedOutputKeys, omitEmptyStrings } = allOptions;
    // In case user has overriden path separator with null or undefined for some reason.
    if (!pathSeparator)
      throw new Error(
        `options.pathSeparator is an invalid value: ${pathSeparator}. Should be a string`,
      );

    if (typeof value === 'string' && value.length === 0 && omitEmptyStrings)
      return;

    if (nestedOutputKeys) {
      const obj: StringKeyObj<any> = pathToNestedObj(
        destinationKey || inputKey,
        pathSeparator,
        parser(value),
      );
      const rootKey = destinationKey
        ? destinationKey.split(pathSeparator)[0]
        : inputKey.split(pathSeparator)[0];
      // Merge deeply with any existing values, but at the deepest level use conflict handler function to resolve.
      if (rootKey) {
        output[rootKey] = deepMerge(
          output[rootKey],
          obj[rootKey],
          conflictHandler,
        );
      }
    } else {
      output[destinationKey || inputKey] = parser(value);
    }
  };
}

export { copy };

import type { StringKeyObj } from './common.mjs';
import type { Options } from './options.mjs';
import type { Parser } from './parsers.mjs';
import pathToNestedObj from 'path-to-nested-obj';
import deepMerge from '@rubicon2/deep-merge';

export interface Output extends StringKeyObj<any> {
  /**
   * _temp stores an object which is instantiated before the _onStart rule
   * and deleted after the _onFinish rule. This can be used to store values
   * from one rule for use in another, or to collect data and put it together
   * at the end in the _onFinish rule.
   */
  _temp: StringKeyObj<any>;
}

/**
 * An object which is passed from the transformer to each rule.
 */
export interface RuleParams {
  /**
   * The input object.
   */
  input: StringKeyObj<any>;
  /**
   * The output object.
   */
  output: Output;
  /**
   * The input key path.
   */
  key: string;
  /**
   * The value retrieved from the input object with the input key path.
   */
  value: any;
  /**
   * The options object as determined when the transformer function was instantiated.
   */
  options: Options;
}

/**
 * The function signature for a rule function.
 */
export interface Rule {
  (params: RuleParams): void;
}

/**
 * The function signature for a conflict handler function.
 * These functions are used to decide whether a or b (or both) should be used on the
 * output object, based on whatever arbitrary conditions are programmed into the function.
 * @param {*} a The first value assigned to this key.
 * @param {*} b The second value assigned to this key.
 * @returns {*} a or b.
 */
export interface ConflictHandler {
  (a: any, b: any): any;
}

/**
 * An object passed to copy in order to set up the returned function.
 */
export interface CopyParams {
  /**
   * Optional function to process the input value before assigning to the
   * output key. Can also be used to construct an object for the value to
   * reside in, before being assigned to the output key.
   */
  parser?: Parser;
  /**
   * The key path on the output object which will contain the value
   * once it has been processed by the parser. This can be a nested
   * path, with each path segment separated by default with a dot.
   */
  destinationKey?: string;
  /**
   * Synonym of destinationKey. Specifies the key path on the output object which
   * will contain the value once it has been processed by the parser. This can be
   * a nested path, with each path segment separated by default with a dot.
   */
  key?: string;
  /**
   * This will be called if there are two non-object values assigned to
   * the same key. By default, deep-merge puts the values into an array.
   */
  conflictHandler?: ConflictHandler;
  /**
   * This can be used to override any options provided by the transformer when it calls the copy rule.
   */
  options?: Options;
}

/**
 * Create a rule function that copies an input value, parses it with an optional parser, and then puts the result on the output object at a key path determined by the user-provided destinationKey. If there is no destinationKey it will copy to the same path as the input key.
 * @param {CopyParams} [params] The params object can include the optional properties: parser, destinationKey, conflictHandler, and options.
 * @returns {Rule} A rule function for use on the rules object when initializing a transformer.
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

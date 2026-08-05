import type { Output, Rule } from './rules.mjs';
import type { Options } from './options.mjs';
import { defaultOptions } from './options.mjs';
import valueFromNestedObj from 'value-from-nested-obj';

/**
 * An object containing rule functions which correspond to keys to be processed on the input object.
 */
export interface Rules extends Record<string, Rule | undefined> {
  /**
   * Runs before all other rules, but after the output._temp object has been created.
   */
  _onStart?: Rule | undefined;
  /**
   * Runs after all other rules, but before the output._temp object is deleted.
   */
  _onFinish?: Rule | undefined;
}

/**
 * Throw errors if the parameters or parameter properties are the wrong types.
 * @param {Rules} [rules] The rules object to check.
 * @param {Options} [options] The options object to check.
 * @returns {void}
 */
function checkTransformerParameters(rules: Rules, options: Options) {
  // Check rules and options are valid. Have to do array separately because in js, arrays are objects.
  if (Array.isArray(rules))
    throw new Error('rules parameter is not an object, but an array');
  if (Array.isArray(options))
    throw new Error('options parameter is not an object, but an array');

  // Null is also an object but that actually works in our favour here.
  if (typeof rules !== 'object')
    throw new Error('rules parameter is not an object, but a ' + typeof rules);
  if (typeof options !== 'object')
    throw new Error(
      'options parameter is not an object, but a ' + typeof options,
    );

  // Make sure every rule is either a function or null (which will skip that key on the input object).
  for (const key in rules) {
    const rule = rules[key];
    const type = typeof rule;
    if (rule !== null && type !== 'function') {
      throw new Error(`rules.${key} is not a function or null, but a ${type}`);
    }
  }

  // Make sure provided options that override defaults are the correct types.
  // Make sure that custom user options are not checked - a user could add other option properties for their own rules.
  for (const key in defaultOptions) {
    const actualType = typeof options?.[key];
    const expectedType = typeof defaultOptions[key];
    // This keeps triggering when actualType is undefined??
    if (actualType !== 'undefined' && actualType !== expectedType) {
      throw new Error(
        `options.${key} is not ${expectedType}, but type ${actualType}`,
      );
    }
  }
}

/**
 * A function returned by object transformer, which can be called with an input
 * object and will run the rules with the options and produce an output object.
 * @param {Record<string, any>} input The input object you want to transform.
 * @returns {Record<string, any>} The transformed object.
 */
export interface TransformerFunction {
  (input: Record<string, any>): Record<string, any>;
}

/**
 * Creates a transformer function with the provided rules and options.
 * @param {Rules} [rules] An object that contains functions which correspond to keys on the input object and build up the output object. Each rule can take a single parameter of type object that can utilise the properties input, output, key, value, options. There are two special keys: _onStart and _onFinish. The former stores a function that runs before all other rules, but after the output._temp object has been created. The latter stores a function that runs after all other rules, but before the output._temp object has been deleted.
 * @param {Options} [options] An optional options object to change the default options. This gets passed to each function on the rules object.
 * @returns {TransformerFunction} A function that takes an input object, runs the rules that build up the output object, and then returns the output object.
 */
export default function transformer(
  rules: Rules = {},
  options: Options = {},
): TransformerFunction {
  // Throw errors if any of the user-provided parameters are bad.
  checkTransformerParameters(rules, options);

  // Default options have all the base options, and user-defined options have been
  // checked to make sure defaults are not overwritten with undefined or null values.
  const allOptions: Required<Options> = {
    ...defaultOptions,
    ...options,
  };

  return (inputObj) => {
    if (!inputObj) throw new Error('No input object provided');
    if (Array.isArray(inputObj))
      throw new Error('inputObj parameter is not an object, but an array');
    if (typeof inputObj !== 'object')
      throw new Error(
        'inputObj parameter is not an object, but a ' + typeof inputObj,
      );

    let outputObj: Output = { _temp: {} };

    if (rules?._onStart) {
      rules._onStart({
        key: '_onStart',
        value: undefined,
        output: outputObj,
        input: inputObj,
        options: allOptions,
      });
    }

    // If user wants to keep all key/values even without a rule, copy them over here.
    // If there are rules for a key, the value copied over here will later be overwritten.
    if (!allOptions.omitRulelessKeys) outputObj = { ...inputObj, ...outputObj };

    for (const rulePath in rules) {
      // Skip built-in rules as these will be run before and after this loop, respectively.
      if (rulePath === '_onStart' || rulePath === '_onFinish') continue;

      // Get value from input obj. This may be nested deeply within input obj.
      let value;
      if (allOptions.nestedInputKeys) {
        // Remove original value of root key if it was copied over from inputObj.
        // Rule may copy value over to a different output path, so we can't assume it will be automatically overwritten.
        const rootKey = rulePath.split(allOptions.pathSeparator)[0];
        if (rootKey) delete outputObj[rootKey];
        value = valueFromNestedObj(
          rulePath,
          allOptions.pathSeparator,
          inputObj,
        );
      } else {
        // Remove original value of flat key.
        // Rule may copy value over to different output path, so we can't assume it will be automatically overwritten.
        delete outputObj[rulePath];
        value = inputObj[rulePath];
      }

      // If value exists, run the rule for this key to build up the outputObj.
      if (value !== undefined) {
        // If user has purposefully assigned null to a rule, skip.
        if (!rules[rulePath]) continue;
        rules[rulePath]({
          input: inputObj,
          output: outputObj,
          key: rulePath,
          value,
          options: allOptions,
        });
      }
    }

    if (rules?._onFinish) {
      rules._onFinish({
        key: '_onFinish',
        value: undefined,
        output: outputObj,
        input: inputObj,
        options: allOptions,
      });
    }

    // Copy values of every key across to final output, except _temp object.
    // _temp is not optional on output passed to rule so user can't delete it.
    const output: Record<string, any> = {};
    for (const key in outputObj) {
      if (key === '_temp') continue;
      else output[key] = outputObj[key];
    }

    return output;
  };
}

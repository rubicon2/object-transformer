import valueFromNestedObj from 'value-from-nested-obj';

// Create local typedefs out of imports to avoid the end-user seeing the import path instead of just the typedef name.
/** @typedef {import('./jsdoc.common.mjs').options} options */
/** @typedef {import('./jsdoc.common.mjs').rule} rule */

/**
 * An object containing rule functions which correspond to keys to be processed on the input object.
 * @typedef {{[key: string]: rule}} rules
 */

// Default transformer settings.
/** @type {rules} */
const defaultRules = {
  _onStart: () => {},
  _onFinish: () => {},
};

/** @type {options} */
const defaultOptions = {
  omitRulelessKeys: false,
  omitEmptyStrings: false,
  pathSeparator: '.',
  nestedInputKeys: true,
  nestedOutputKeys: true,
};

/**
 * The function returned by the transformer, which can be called with an input object and will run the rules with the options and produce an output object.
 * @callback transformerFunction
 * @param {object} input
 * @returns {object} The transformed object.
 */

/**
 * @param {rules} [rules] - An optional object that contains functions which correspond to keys on the input object and build up the output object. Each rule can take a single parameter of type object that can utilise the properties input, output, key, value, options. There are two special keys: the function corresponding to the _onStart key will be called before all other rules, but after the output._temp object has been created, while the function corresponding to the _onFinish key will be called after all other rules but before output._temp has been deleted.
 * @param {rule} [rules._onStart] - A function that runs before all other rules, but after the output._temp object has been created.
 * @param {rule} [rules._onFinish] - A function runs after all other rules, but before the output._temp object has been deleted.
 * @param {options} [options] - An optional options object to change the default options. This gets passed to each function on the rules object.
 * @returns {transformerFunction} A function that takes an input object, runs the rules that build up the output object, and then returns the output object.
 */
export default function transformer(
  rules = defaultRules,
  options = defaultOptions,
) {
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

  // Define default rules/options and overwrite with user defined rules/options.
  /** @type {rules} */
  const allRules = {
    ...defaultRules,
    ...rules,
  };

  /** @type {options} */
  const allOptions = {
    ...defaultOptions,
    ...options,
  };

  return (inputObj = {}) => {
    let outputObj = { _temp: {} };

    allRules._onStart({
      output: outputObj,
      input: inputObj,
      options: allOptions,
    });

    // If user wants to keep all key/values even without a rule, copy them over here.
    // If there are rules for a key, the value copied over here will later be overwritten.
    if (!allOptions.omitRulelessKeys) outputObj = { ...inputObj, ...outputObj };

    for (const rulePath in allRules) {
      // Skip built-in rules as these will be run before and after this loop, respectively.
      if (rulePath === '_onStart' || rulePath === '_onFinish') continue;

      // Get value from input obj. This may be nested deeply within input obj.
      let value;
      if (allOptions.nestedInputKeys) {
        // Remove original value of root key if it was copied over from inputObj.
        // Rule may copy value over to a different output path, so we can't assume it will be automatically overwritten.
        const rootKey = rulePath.split(allOptions.pathSeparator)[0];
        delete outputObj[rootKey];
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
        if (allRules[rulePath] === null) continue;
        allRules[rulePath]({
          input: inputObj,
          output: outputObj,
          key: rulePath,
          value,
          options: allOptions,
        });
      }
    }

    allRules._onFinish({
      output: outputObj,
      input: inputObj,
      options: allOptions,
    });

    // Delete _temp object right at the end after _onFinish runs, now we no longer need it.
    delete outputObj._temp;
    return outputObj;
  };
}

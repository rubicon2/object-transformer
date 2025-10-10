import valueFromNestedObj from 'value-from-nested-obj';

export default function transformer(rules = {}, options = {}) {
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
  const allRules = {
    _onStart: () => {},
    _onFinish: () => {},
    ...rules,
  };

  const allOptions = {
    omitRulelessKeys: false,
    omitEmptyStrings: false,
    pathSeparator: '.',
    nestedInputKeys: true,
    nestedOutputKeys: true,
    ...options,
  };

  return (inputObj = {}) => {
    let outputObj = { temp: {} };

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
        // If user does not want to keep empty strings.
        if (
          typeof value === 'string' &&
          value.length === 0 &&
          allOptions.omitEmptyStrings
        )
          continue;
        // If user has purposefully assigned null to a rule, skip.
        if (allRules[rulePath] === null) continue;
        allRules[rulePath]({
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

    // Delete temp object right at the end after _onFinish runs, now we no longer need it.
    delete outputObj.temp;
    return outputObj;
  };
}

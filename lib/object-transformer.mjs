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
    ...options,
  };

  return (inputObj) => {
    const outputObj = { temp: {} };
    allRules._onStart({
      output: outputObj,
      input: inputObj,
      options: allOptions,
    });

    for (const key in inputObj) {
      const value = inputObj[key];
      if (allRules[key])
        allRules[key]({ output: outputObj, key, value, options: allOptions });
      // If user has assigned null rule on purpose, skip it.
      else if (allRules[key] === null) continue;
      // If rule is undefined, i.e. user has not stated any intentions to skip.
      // But only if option to omit keys with no rules is set to false.
      else if (!allOptions.omitRulelessKeys) outputObj[key] = value;
    }

    allRules._onFinish({
      output: outputObj,
      input: inputObj,
      options: allOptions,
    });
    delete outputObj.temp;

    return outputObj;
  };
}

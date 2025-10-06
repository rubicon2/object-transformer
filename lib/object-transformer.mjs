export default function transformer(rules = {}, options = {}) {
  // Define default rules/options and overwrite with user defined rules/options.
  const allRules = {
    _onStart: () => {},
    _onFinished: () => {},
    ...rules,
  };

  const allOptions = {
    omitRulelessKeys: false,
    ...options,
  };

  return (inputObj) => {
    const outputObj = { temp: {} };
    allRules._onStart(outputObj, inputObj);

    for (const key in inputObj) {
      const value = inputObj[key];
      if (allRules[key]) allRules[key](outputObj, key, value, options);
      // If user has assigned null rule on purpose, skip it.
      else if (allRules[key] === null) continue;
      // If rule is undefined, i.e. user has not stated any intentions to skip.
      // But only if option to omit keys with no rules is set to false.
      else if (!allOptions.omitRulelessKeys) outputObj[key] = value;
    }

    allRules._onFinished(outputObj, inputObj);
    delete outputObj.temp;

    return outputObj;
  };
}

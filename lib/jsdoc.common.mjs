// For any jsdoc types that need to be referenced in multiple files.

/**
 * Transformer options which get passed to each rule. Can be overridden on a rule-by-rule basis, or ignored by the rule.
 * @typedef {object} options
 * @property {boolean} [omitRulelessKeys] - Whether keys with no user-defined rule should be copied over to the output or ignored.
 * @property {boolean} [omitEmptyValues] - A boolean that each rule can use to determine whether to skip an empty value. What is considered 'empty' will be different for strings, arrays, etc., so the rule function will implement the logic to decide whether the value is considered empty or not.
 * @property {string} [pathSeparator] - The delimiter to use for nested object paths.
 * @property {boolean} [nestedInputKeys] - Whether the input keys should use the pathSeparator to determine object nesting, or be treated as flat keys - i.e. if false, 'my.nested.key' and 'myKey' are both on the root of the object.
 * @property {boolean} [nestedOutputKeys] - Whether the output keys should use the pathSeparator to determine object nesting, or be treated as flat keys - i.e. if false, 'my.nested.key' and 'myKey' are both on the root of the object.
 */

/**
 * Rule function for creating transformer rules.
 * @callback rule
 * @param {object} params
 * @param {object} params.input - The input object.
 * @param {object} params.output - The output object.
 * @param {string} params.key - The input key path.
 * @param {*} params.value - The value retrieved from the input object with the input key path.
 * @param {options} params.options - The options object as determined when the transformer was instantiated.
 * @returns {void}
 */

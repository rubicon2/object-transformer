// For any jsdoc types that need to be referenced in multiple files.

/**
 * An object that can store any type of value in any arbitrary key. JSdoc and TS constantly moan about using the "any" type, but since this is designed for the user to create their own rules and options, it has to be "any".
 * @interface
 */
export interface StringKeyObj<T> {
  [key: string]: T;
}

/**
 * Options which get passed to each rule. Can be overridden on a rule-by-rule basis, or ignored by the rule.
 * @interface
 * @property {boolean} [omitRulelessKeys] - Whether keys with no user-defined rule should be copied over to the output or ignored. Defaults to false.
 * @property {boolean} [omitEmptyStrings] - Whether keys with a value equal to an empty string should have their rule run or be ignored. Defaults to false.
 * @property {string} [pathSeparator] - The delimiter to use for nested object paths. Defaults to '.'.
 * @property {boolean} [nestedInputKeys] - Whether the input keys should use the pathSeparator to determine object nesting, or be treated as flat keys - i.e. if false, 'my.nested.key' and 'myKey' are both on the root of the object. Defaults to true.
 * @property {boolean} [nestedOutputKeys] - Whether the output keys should use the pathSeparator to determine object nesting, or be treated as flat keys - i.e. if false, 'my.nested.key' and 'myKey' are both on the root of the object. Defaults to true.
 */
export interface Options extends StringKeyObj<any> {
  omitRulelessKeys?: boolean;
  omitEmptyStrings?: boolean;
  pathSeparator?: string;
  nestedInputKeys?: boolean;
  nestedOutputKeys?: boolean;
}

export const defaultOptions: Required<Options> = {
  omitRulelessKeys: false,
  omitEmptyStrings: false,
  pathSeparator: '.',
  nestedInputKeys: true,
  nestedOutputKeys: true,
};

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
 * @param {*} value - Input value, of any type.
 * @returns {*} Output value, of any type.
 */
export interface Parser {
  (value: any): any;
}

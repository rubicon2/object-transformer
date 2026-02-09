import type { StringKeyObj } from './jsdoc.common.mjs';

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

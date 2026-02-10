import type { StringKeyObj } from './common.mjs';

/**
 * An object containing options which get passed to each rule. Can be overridden on a rule-by-rule basis.
 */
export interface Options extends StringKeyObj<any> {
  /**
   * Whether keys with no user-defined rule should be copied over to the output or ignored. Defaults to false.
   */
  omitRulelessKeys?: boolean;
  /**
   * Whether keys with a value equal to an empty string should have their rule run or be ignored. Defaults to false.
   */
  omitEmptyStrings?: boolean;
  /**
   * The delimiter to use for nested object paths. Defaults to '.'.
   */
  pathSeparator?: string;
  /**
   * Whether the input keys should use the pathSeparator to determine object
   * nesting, or be treated as flat keys - i.e. if false, 'my.nested.key'
   * and 'myKey' are both on the root of the object. Defaults to true.
   */
  nestedInputKeys?: boolean;
  /**
   * Whether the output keys should use the pathSeparator to determine
   * object nesting, or be treated as flat keys - i.e. if false, 'my.nested.key'
   * and 'myKey' are both on the root of the object. Defaults to true.
   */
  nestedOutputKeys?: boolean;
}

/**
 * Default options. User-provided options will be merged into
 * the default options, so long as they are the correct type.
 */
export const defaultOptions: Required<Options> = {
  omitRulelessKeys: false,
  omitEmptyStrings: false,
  pathSeparator: '.',
  nestedInputKeys: true,
  nestedOutputKeys: true,
};

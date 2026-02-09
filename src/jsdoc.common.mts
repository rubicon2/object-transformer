// For any jsdoc types that need to be referenced in multiple files.

/**
 * An object that can store any type of value in any arbitrary key. JSdoc and TS constantly moan about using the "any" type, but since this is designed for the user to create their own rules and options, it has to be "any".
 * @interface
 */
export interface StringKeyObj<T> {
  [key: string]: T;
}

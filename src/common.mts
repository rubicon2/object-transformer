/**
 * A generic object that can store any type of value keyed to a string.
 * Without this, typescript will complain if you try to assign values to
 * arbitrary keys on an object.
 */
export interface StringKeyObj<T> {
  [key: string]: T;
}

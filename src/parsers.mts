/**
 * Function signature for parsers, which should take a value of one type and turn it into another.
 * @param {*} value - Input value, of any type.
 * @returns {*} Output value, of any type.
 */
export interface Parser {
  (value: any): any;
}

// Match format of parseFloat, parseInt, etc.

/**
 * Wrapper around built-in Date object, to avoid writing (v) => new Date(v) all the time when parsing date values.
 * @param {string} str - A date in string format.
 * @returns {Date} A Date object created from the input string.
 */
const parseDate: Parser = function (str: string): Date {
  return new Date(str);
};

export { parseDate };

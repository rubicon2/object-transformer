// Match format of parseFloat, parseInt, etc.

/**
 * Wrapper around built-in Date object, to avoid writing (v) => new Date(v) all the time when parsing date values.
 * @param {string} str - A date in string format.
 * @returns {Date} A Date object created from the input string.
 */
function parseDate(str) {
  return new Date(str);
}

export { parseDate };

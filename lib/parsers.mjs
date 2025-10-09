// Match format of parseFloat, parseInt, etc.

// Very basic wrapper around built-in Date object just to make it more convenient.
// Otherwise, everytime you want to parse a date, it has to be written like (v) => new Date(v).
// No error checking, etc., we want this to behave exactly like the js date constructor.
function parseDate(str) {
  return new Date(str);
}

export { parseDate };

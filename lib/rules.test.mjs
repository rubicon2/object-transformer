import * as rules from './rules.mjs';
import { describe, it, expect, beforeEach } from 'vitest';

let output;

beforeEach(() => {
  output = {};
});

describe('rules', () => {
  it.each(
    Object.keys(rules).map((key) => ({
      name: key,
      fn: rules[key],
      expected: 'function',
    })),
  )('$name function should return a function', ({ fn, expected }) => {
    const rule = fn();
    expect(typeof rule).toStrictEqual(expected);
  });
});

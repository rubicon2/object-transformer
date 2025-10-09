import * as parsers from './parsers.mjs';
import { describe, it, expect } from 'vitest';

describe('parsers', () => {
  it.each(
    Object.keys(parsers).map((key) => ({
      name: key,
      fn: parsers[key],
    })),
  )('$name parser should be of type function', ({ fn }) => {
    expect(typeof fn).toBe('function');
  });

  describe('parseDate', () => {
    it.each([
      {
        input: '1996-12-25',
        expectedOutput: new Date('1996-12-25'),
      },
      {
        input: '2006-12-25',
        expectedOutput: new Date('2006-12-25'),
      },
    ])(
      'given a parameter of a date formatted as a string, should return a date object with the same date',
      ({ input, expectedOutput }) => {
        expect(parsers.parseDate(input)).toStrictEqual(expectedOutput);
      },
    );
  });
});

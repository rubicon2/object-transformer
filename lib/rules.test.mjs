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

  describe('copy', () => {
    it('by default should copy value from input object to output object, with the same key', () => {
      const copy = rules.copy();
      copy({
        output,
        key: 'myKey',
        value: 'this should get copied to output object',
      });
      expect(output).toStrictEqual({
        myKey: 'this should get copied to output object',
      });
    });

    describe('params object', () => {
      it.each([
        {
          name: 'integer',
          parser: (v) => parseInt(v),
          value: '97',
          expected: 97,
        },
        {
          name: 'float',
          parser: (v) => parseFloat(v),
          value: '9.7',
          expected: 9.7,
        },
      ])(
        'can take a parser property that is used to process the input value to a $name',
        ({ parser, value, expected }) => {
          const copyWithParser = rules.copy({ parser });
          copyWithParser({ output, key: 'myKey', value });
          expect(output.myKey).toStrictEqual(expected);
        },
      );

      it.each([
        {
          destinationKey: 'theOutputKey',
          value:
            'copied from a different key, and plopped into a different key on the output object',
        },
        {
          destinationKey: 'aDifferentOutputKey',
          value: 'copied to another key',
        },
      ])(
        'can take a desinationKey to copy the value from one key on the input and map to a different key on the output object',
        ({ destinationKey, value }) => {
          const copyToDestinationKey = rules.copy({ destinationKey });
          copyToDestinationKey({ output, key: 'theInputKey', value });
          expect(output).toStrictEqual({
            [destinationKey]: value,
          });
        },
      );
    });
  });
});

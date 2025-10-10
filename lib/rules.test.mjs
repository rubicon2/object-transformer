import * as rules from './rules.mjs';
import { describe, it, expect, beforeEach } from 'vitest';

let output;
const options = {
  pathSeparator: '.',
  nestedOutputKeys: true,
};

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
        options,
      });
      expect(output).toStrictEqual({
        myKey: 'this should get copied to output object',
      });
    });

    it.each([
      {
        startObj: {
          my: {
            nested: {
              keys: {
                alpha: 'myAlphaValue',
              },
            },
          },
        },
        destinationKey: 'my.nested.keys.omega',
        value: 'myOmegaValue',
        expectedOutput: {
          my: {
            nested: {
              keys: {
                alpha: 'myAlphaValue',
                omega: 'myOmegaValue',
              },
            },
          },
        },
      },
      {
        startObj: {
          my: {
            nested: {
              keys: {
                alpha: 'myAlphaValue',
              },
            },
          },
        },
        destinationKey: 'my.nested.keys.alpha',
        value: 'myNewAlphaValue',
        expectedOutput: {
          my: {
            nested: {
              keys: {
                alpha: ['myAlphaValue', 'myNewAlphaValue'],
              },
            },
          },
        },
      },
    ])(
      'where a rule collides with existing output, merge, with by default deep conflicts being merged into an array to avoid losing data',
      ({ startObj, destinationKey, value, expectedOutput }) => {
        // Part of the rationale here, is that the code for merging the conflicting items into an array is more complicated than anything else.
        // It is a lot easier to override the default deepMerge behaviour with a lambda function like (a, b) => b if the user wants to overwrite.
        output = startObj;
        const copy = rules.copy({ destinationKey });
        copy({ output, key: 'sourceKey', value, options });
        expect(output).toStrictEqual(expectedOutput);
      },
    );

    it('nestedOutputKeys option can be set to false to prevent use of nested object paths on the output object', () => {
      const copyWithFlatKeys = rules.copy();
      copyWithFlatKeys({
        output,
        key: 'my.input.path',
        value: 'my flat value',
        options: { ...options, nestedOutputKeys: false },
      });
      expect(output).toStrictEqual({
        'my.input.path': 'my flat value',
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
          copyWithParser({ output, key: 'myKey', value, options });
          expect(output.myKey).toStrictEqual(expected);
        },
      );

      it.each([
        {
          destinationKey: 'theOutputKey',
          value: 'my output value',
          expectedOutput: {
            theOutputKey: 'my output value',
          },
        },
        {
          destinationKey: 'aDifferentOutputKey',
          value: 'copied to another key',
          expectedOutput: {
            aDifferentOutputKey: 'copied to another key',
          },
        },
        {
          destinationKey: 'my.nested.key',
          value: 'my nested value',
          expectedOutput: {
            my: {
              nested: {
                key: 'my nested value',
              },
            },
          },
        },
        {
          destinationKey: 'a.different.nested.key',
          value: 'my nested value, again',
          expectedOutput: {
            a: {
              different: {
                nested: {
                  key: 'my nested value, again',
                },
              },
            },
          },
        },
      ])(
        'can take a desinationKey to copy the value from one key on the input and map to a different key on the output object',
        ({ destinationKey, value, expectedOutput }) => {
          const copyToDestinationKey = rules.copy({ destinationKey });
          copyToDestinationKey({
            output,
            key: 'theInputKey',
            value,
            options,
          });
          expect(output).toStrictEqual(expectedOutput);
        },
      );

      describe('options object', () => {
        it.each([
          {
            ruleParams: {
              options: {
                pathSeparator: '/',
              },
              destinationKey: 'my/nested/key',
            },
            expectedOutput: {
              my: {
                nested: {
                  key: 'my nested value',
                },
              },
            },
          },
          {
            ruleParams: {
              options: {
                pathSeparator: '-',
              },
              destinationKey: 'my-nested-key',
            },
            expectedOutput: {
              my: {
                nested: {
                  key: 'my nested value',
                },
              },
            },
          },
        ])(
          'can take an options object to override options provided in calls to the returned function',
          ({ ruleParams, expectedOutput }) => {
            const copyWithLocalOptions = rules.copy(ruleParams);
            copyWithLocalOptions({
              output,
              key: 'myKey',
              value: 'my nested value',
              // So options.pathSeparator will go unused in favour of ruleParams.options.pathSeparator.
              options,
            });
            expect(output).toStrictEqual(expectedOutput);
          },
        );

        it.each([
          {
            copyOptions: { omitEmptyStrings: true },
            expectedOutput: {},
          },
          {
            copyOptions: { omitEmptyStrings: false },
            expectedOutput: {
              myEmptyString: '',
            },
          },
        ])(
          'can assign boolean value to options omitEmptyStrings to override transformer option property',
          ({ copyOptions, expectedOutput }) => {
            const copyNonEmptyString = rules.copy({
              options: copyOptions,
            });
            copyNonEmptyString({
              output,
              key: 'myEmptyString',
              value: '',
              // So this will be overridden by any parameters in the options object provided in call to rules.copy().
              options,
            });
            expect(output).toStrictEqual(expectedOutput);
          },
        );
      });
    });

    it.each([
      {
        testName: 'keep largest number',
        existingOutput: {
          myKey: 9,
        },
        destinationKey: 'myKey',
        value: -72,
        conflictHandler: (a, b) => (a > b ? a : b),
        expectedOutput: {
          myKey: 9,
        },
      },
      {
        testName: 'keep largest number, nested',
        existingOutput: {
          my: { nested: { key: 9 } },
        },
        destinationKey: 'my.nested.key',
        value: -72,
        conflictHandler: (a, b) => (a > b ? a : b),
        expectedOutput: {
          my: { nested: { key: 9 } },
        },
      },
      {
        testName: 'keep smallest number',
        existingOutput: {
          myKey: 9,
        },
        destinationKey: 'myKey',
        value: -72,
        conflictHandler: (a, b) => (a < b ? a : b),
        expectedOutput: {
          myKey: -72,
        },
      },
      {
        testName: 'keep smallest number, nested',
        existingOutput: {
          my: { nested: { key: 9 } },
        },
        destinationKey: 'my.nested.key',
        value: -72,
        conflictHandler: (a, b) => (a < b ? a : b),
        expectedOutput: {
          my: { nested: { key: -72 } },
        },
      },
    ])(
      'can take a conflictHandler function to customise behaviour to handle conflicts on the deepest level - $testName',
      ({
        existingOutput,
        destinationKey,
        value,
        conflictHandler,
        expectedOutput,
      }) => {
        output = existingOutput;
        const copy = rules.copy({ destinationKey, conflictHandler });
        copy({ output, destinationKey, value, options });
        expect(output).toStrictEqual(expectedOutput);
      },
    );
  });
});

import type { Options, Output } from '../dist/index.mjs';

import { copy as createCopyRule } from '../dist/index.mjs';
import { describe, it, expect, beforeEach } from 'vitest';

let input: Record<string, any>;
let output: Output;

const options: Required<Options> = {
  pathSeparator: '.',
  nestedInputKeys: true,
  nestedOutputKeys: true,
  omitEmptyStrings: true,
  omitRulelessKeys: true,
};

beforeEach(() => {
  input = {};
  output = { _temp: {} };
});

describe('copy', () => {
  it('by default should copy value from input object to output object, with the same key', () => {
    const copy = createCopyRule();
    copy({
      input,
      output,
      key: 'myKey',
      value: 'this should get copied to output object',
      options,
    });
    expect(output).toStrictEqual({
      _temp: {},
      myKey: 'this should get copied to output object',
    });
  });

  it.each([
    {
      startObj: {
        _temp: {},
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
        _temp: {},
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
        _temp: {},
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
        _temp: {},
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
      const copy = createCopyRule({ destinationKey });
      copy({ input, output, key: 'sourceKey', value, options });
      expect(output).toStrictEqual(expectedOutput);
    },
  );

  it('nestedOutputKeys option can be set to false to prevent use of nested object paths on the output object', () => {
    const copyWithFlatKeys = createCopyRule();
    copyWithFlatKeys({
      input,
      output,
      key: 'my.input.path',
      value: 'my flat value',
      options: { ...options, nestedOutputKeys: false },
    });
    expect(output).toStrictEqual({
      _temp: {},
      'my.input.path': 'my flat value',
    });
  });

  describe('params object', () => {
    it.each([
      {
        name: 'integer',
        parser: (v: string) => parseInt(v),
        value: '97',
        expected: 97,
      },
      {
        name: 'float',
        parser: (v: string) => parseFloat(v),
        value: '9.7',
        expected: 9.7,
      },
    ])(
      'can take a parser property that is used to process the input value to a $name',
      ({ parser, value, expected }) => {
        const copyWithParser = createCopyRule({ parser });
        copyWithParser({ input, output, key: 'myKey', value, options });
        expect(output.myKey).toStrictEqual(expected);
      },
    );

    it.each([
      {
        destinationKey: 'theOutputKey',
        value: 'my output value',
        expectedOutput: {
          _temp: {},
          theOutputKey: 'my output value',
        },
      },
      {
        destinationKey: 'aDifferentOutputKey',
        value: 'copied to another key',
        expectedOutput: {
          _temp: {},
          aDifferentOutputKey: 'copied to another key',
        },
      },
      {
        destinationKey: 'my.nested.key',
        value: 'my nested value',
        expectedOutput: {
          _temp: {},
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
          _temp: {},
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
        const copyToDestinationKey = createCopyRule({ destinationKey });
        copyToDestinationKey({
          input,
          output,
          key: 'theInputKey',
          value,
          options,
        });
        expect(output).toStrictEqual(expectedOutput);
      },
    );

    it.each([
      {
        propName: 'destinationKey',
      },
      {
        propName: 'key',
      },
    ])(
      'can take a key as a synonym of destinationKey, since typing destinationKey over and over is really long',
      ({ propName }) => {
        const copyToKey = createCopyRule({ [propName]: 'my.output.key' });
        copyToKey({
          input,
          output,
          key: 'the input key',
          value: 'my value',
          options,
        });
        expect(output).toStrictEqual({
          _temp: {},
          my: {
            output: {
              key: 'my value',
            },
          },
        });
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
            _temp: {},
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
            _temp: {},
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
          const copyWithLocalOptions = createCopyRule(ruleParams);
          copyWithLocalOptions({
            input,
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
          expectedOutput: { _temp: {} },
        },
        {
          copyOptions: { omitEmptyStrings: false },
          expectedOutput: {
            _temp: {},
            myEmptyString: '',
          },
        },
      ])(
        'can assign boolean value to options omitEmptyStrings to override transformer option property',
        ({ copyOptions, expectedOutput }) => {
          const copyNonEmptyString = createCopyRule({
            options: copyOptions,
          });
          copyNonEmptyString({
            input,
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
        _temp: {},
        myKey: 9,
      },
      destinationKey: 'myKey',
      value: -72,
      conflictHandler: (a: number, b: number) => (a > b ? a : b),
      expectedOutput: {
        _temp: {},
        myKey: 9,
      },
    },
    {
      testName: 'keep largest number, nested',
      existingOutput: {
        _temp: {},
        my: { nested: { key: 9 } },
      },
      destinationKey: 'my.nested.key',
      value: -72,
      conflictHandler: (a: number, b: number) => (a > b ? a : b),
      expectedOutput: {
        _temp: {},
        my: { nested: { key: 9 } },
      },
    },
    {
      testName: 'keep smallest number',
      existingOutput: {
        _temp: {},
        myKey: 9,
      },
      destinationKey: 'myKey',
      value: -72,
      conflictHandler: (a: number, b: number) => (a < b ? a : b),
      expectedOutput: {
        _temp: {},
        myKey: -72,
      },
    },
    {
      testName: 'keep smallest number, nested',
      existingOutput: {
        _temp: {},
        my: { nested: { key: 9 } },
      },
      destinationKey: 'my.nested.key',
      value: -72,
      conflictHandler: (a: number, b: number) => (a < b ? a : b),
      expectedOutput: {
        _temp: {},
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
      const copy = createCopyRule({ key: destinationKey, conflictHandler });
      copy({ input, output, key: destinationKey, value, options });
      expect(output).toStrictEqual(expectedOutput);
    },
  );
});

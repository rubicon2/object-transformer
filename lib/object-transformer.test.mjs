import transformer from './object-transformer.mjs';
import { describe, it, expect, vi } from 'vitest';

describe('object-transformer', () => {
  it('returns a function', () => {
    const t = transformer();
    expect(typeof t).toStrictEqual('function');
  });

  describe('returned function', () => {
    it('returns an object', () => {
      const t = transformer();
      expect(typeof t()).toStrictEqual('object');
    });

    it('does not throw an error even if the user calls the transformer function without an input object', () => {
      const t = transformer();
      expect(() => t()).not.toThrowError();
    });

    it('returns an empty object if the user calls the transformer function without an input object', () => {
      const t = transformer();
      const outputObj = t();
      expect(outputObj).toStrictEqual({});
    });

    it.each([
      {
        sourceKey: 'my.nested.key',
        destinationKey: undefined,
        inputObj: {
          my: {
            nested: {
              key: 'my nested value',
            },
          },
        },
        options: {},
        expectedOutput: {
          'my.nested.key': 'my nested value',
        },
      },
      {
        sourceKey: 'my.nested.key',
        destinationKey: 'aDifferentKey',
        inputObj: {
          my: {
            nested: {
              key: 'my nested value',
            },
          },
        },
        expectedOutput: {
          aDifferentKey: 'my nested value',
        },
      },
      {
        sourceKey: 'my.nested.key',
        destinationKey: 'a.different.nested.key',
        inputObj: {
          my: {
            nested: {
              key: 'my nested value',
            },
          },
        },
        expectedOutput: {
          'a.different.nested.key': 'my nested value',
        },
      },
    ])(
      'can retrieve values from nested objects with key paths',
      ({ inputObj, sourceKey, destinationKey, expectedOutput }) => {
        const rules = {
          [sourceKey]: ({ output, key, value }) =>
            (output[destinationKey || key] = value),
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj).toStrictEqual(expectedOutput);
      },
    );

    it('calls each rule with a parameter of type object, for _onStart and _onFinish containing input, output and options properties, and on all other rules also including key and value properties', () => {
      let _onStartParams = {};
      let myKeyParams = {};
      let _onFinishParams = {};

      const _onStart = vi.fn((params) => {
        _onStartParams = structuredClone(params);
        // To make sure the saved params are different from the params given to the next function, i.e. the change sticks.
        params.output._temp._onStart = 'saved to temp';
      });

      const myKey = vi.fn((params) => {
        myKeyParams = structuredClone(params);
        // To make sure the saved params are different from the params given to the next function, i.e. the change sticks.
        params.output.myKey = params.value;
      });

      const _onFinish = vi.fn(
        (params) => (_onFinishParams = structuredClone(params)),
      );

      const rules = {
        _onStart,
        myKey,
        _onFinish,
      };

      const options = {
        omitRulelessKeys: false,
        omitEmptyStrings: false,
        pathSeparator: '.',
        nestedInputKeys: true,
        nestedOutputKeys: true,
      };

      const inputObj = {
        myKey: 'my value',
      };

      const t = transformer(rules, options);
      t(inputObj);

      // toHaveBeenLastCalledWith doesn't allow very nuanced inspection of the args if they are objects.
      // Instead, have each mock function create a deep copy of the params object that is passed to it.
      // Then we can check if the rule was called, and then check the saved copy of the params for expected values.
      expect(_onStart).toHaveBeenCalledTimes(1);
      expect(_onStartParams).toStrictEqual({
        input: inputObj,
        output: { _temp: {} },
        options,
      });

      expect(myKey).toHaveBeenCalledTimes(1);
      expect(myKeyParams).toStrictEqual({
        input: inputObj,
        output: { _temp: { _onStart: 'saved to temp' } },
        key: 'myKey',
        value: 'my value',
        options,
      });

      expect(_onFinish).toHaveBeenCalledTimes(1);
      expect(_onFinishParams).toStrictEqual({
        input: inputObj,
        output: { myKey: 'my value', _temp: { _onStart: 'saved to temp' } },
        options,
      });
    });

    it('calls _onStart before all other rule functions', () => {
      const _onStart = vi.fn();
      const myKey = vi.fn();
      const _onFinish = vi.fn();

      const rules = {
        _onStart,
        myKey,
        _onFinish,
      };

      const inputObj = {
        myKey: 'my value',
      };

      const t = transformer(rules);
      t(inputObj);

      expect(_onStart).toHaveBeenCalledBefore(myKey);
      expect(_onStart).toHaveBeenCalledBefore(_onFinish);
    });

    it('calls _onFinish after all other rule functions', () => {
      const _onStart = vi.fn();
      const myKey = vi.fn();
      const _onFinish = vi.fn();

      const rules = {
        _onStart,
        myKey,
        _onFinish,
      };

      const inputObj = {
        myKey: 'my value',
      };

      const t = transformer(rules);
      t(inputObj);

      expect(_onFinish).toHaveBeenCalledAfter(_onStart);
      expect(_onFinish).toHaveBeenCalledAfter(myKey);
    });

    describe('rules object parameter', () => {
      it('works even if the user does not provide a rules object', () => {
        const t = transformer();
        const outputObj = t();
        expect(outputObj).toStrictEqual({});
      });

      it('works even if the user does provides an empty rules object', () => {
        const t = transformer({});
        const outputObj = t();
        expect(outputObj).toStrictEqual({});
      });

      it('works even if the user does provides a null rules object', () => {
        const t = transformer(null);
        const outputObj = t();
        expect(outputObj).toStrictEqual({});
      });

      it.each([
        {
          rules: 'invalid rules parameter',
          parameterType: ' string',
        },
        {
          rules: 1997,
          parameterType: ' number',
        },
        {
          rules: ['an', 'array'],
          parameterType: 'n array',
        },
      ])(
        'gives a useful error message if the type of rules parameter is not object, but type $parameterType',
        ({ rules, parameterType }) => {
          expect(() => transformer(rules)).toThrowError(
            'rules parameter is not an object, but a' + parameterType,
          );
        },
      );

      it('by default, with no rule for a key, just copies the value over unchanged', () => {
        const inputObj = {
          key1: 'blah',
        };

        const t = transformer();
        const outputObj = t(inputObj);
        expect(outputObj).toStrictEqual(inputObj);
      });

      it('works if the user makes a rule for a key that does not exist on the input object', () => {
        const inputObj = {
          key1: 'I thought up this test when I was falling asleep, how weird is that?',
          key2: 'A totally normal string',
        };

        const rules = {
          key3: ({ output, key, value }) => (output[key] = value),
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj).toStrictEqual(inputObj);
      });

      it('can give a null rule to skip a key', () => {
        const inputObj = {
          key1: 'blah',
          key2: 97,
        };

        const rules = {
          key1: null,
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);
        expect(outputObj).toStrictEqual({
          key2: 97,
        });
      });

      it('can parse the value of an input key into a different data type', () => {
        const inputObj = {
          key1: 'some',
          key2: '97',
        };

        const rules = {
          key1: ({ output, key, value }) => (output[key] = value + ' string'),
          key2: ({ output, key, value }) => (output[key] = parseInt(value)),
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj).toStrictEqual({
          key1: 'some string',
          key2: 97,
        });
      });

      it("can create complex objects containing the input key's value", () => {
        const inputObj = {
          myKey: '1997',
        };

        const rules = {
          myKey: ({ output, key, value }) =>
            (output[key] = { a: { b: parseInt(value) } }),
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj).toStrictEqual({
          myKey: {
            a: {
              b: 1997,
            },
          },
        });
      });

      it("can map an input key's value to a different output key", () => {
        const inputObj = {
          originalKey: '97',
        };

        const rules = {
          originalKey: ({ output, value }) => (output.newKey = parseInt(value)),
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj).toStrictEqual({
          newKey: 97,
        });
      });

      it('can use a temp object to store values that need to be carried over from one rule to another, and is cleared once transformer is finished', () => {
        const inputObj = {
          titles: [7, 8, 9],
          years: [1997, 1999, 2000],
          mainChars: ['Cloud', 'Squall', 'Zidane'],
        };

        const rules = {
          titles: ({ output, value }) => {
            output._temp.titles = [...value];
          },
          years: ({ output, value }) => {
            output._temp.years = [...value];
          },
          mainChars: ({ output, value }) => {
            output._temp.mainChars = [...value];
          },
          _onFinish: ({ output }) => {
            const { titles, years, mainChars } = output._temp;
            output.games = [];
            while (titles.length || years.length || mainChars.length) {
              output.games.push({
                title: titles.pop(),
                year: years.pop(),
                mainChar: mainChars.pop(),
              });
            }
          },
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj.games).toContainEqual({
          title: inputObj.titles[0],
          year: inputObj.years[0],
          mainChar: inputObj.mainChars[0],
        });

        expect(outputObj.games).toContainEqual({
          title: inputObj.titles[1],
          year: inputObj.years[1],
          mainChar: inputObj.mainChars[1],
        });

        expect(outputObj.games).toContainEqual({
          title: inputObj.titles[2],
          year: inputObj.years[2],
          mainChar: inputObj.mainChars[2],
        });

        expect(outputObj._temp).toBeUndefined();
      });

      it('has an _onStart function which can be used to do any initialization before the rules are run', () => {
        // Honestly I can't think of a single use case for initialization like this.
        // The object will slowly get built up rule by rule until you have the final object,
        // but what do I know? Putting this in just in case someone else finds a use for it.
        const inputObjA = {
          someKey: 'Whatever, man',
        };

        const rules = {
          _onStart: ({ output, input }) => {
            output.meta = {};
            output.meta.fieldCount = Array.from(Object.keys(input)).length;
          },
        };

        const t = transformer(rules);
        const outputObjA = t(inputObjA);

        expect(outputObjA).toStrictEqual({
          ...inputObjA,
          meta: {
            fieldCount: 1,
          },
        });

        const inputObjB = {
          anotherKey: 'Coffee is a good substance',
          thirdKey: 'No I mean really good',
        };

        const outputObjB = t({
          ...inputObjA,
          ...inputObjB,
        });

        expect(outputObjB).toStrictEqual({
          ...inputObjA,
          ...inputObjB,
          meta: {
            fieldCount: 3,
          },
        });
      });

      it('has an _onFinish function which can use temp object properties before the temp object is removed', () => {
        // The idea of this is to tie together an output key which pertains to multiple input keys,
        // or multiple input keys that relate to each other.
        // If we wait until all input keys have been done, we don't have to worry about the order the inputs come in,
        // and program around that (had to do that with urlQueryToPrisma and it was fiddly and annoying).
        const inputObj = {
          someKey:
            'This will be stored in obj.temp, then used by _end, then removed before assertion checks.',
        };

        const rules = {
          someKey: ({ output, key, value }) => (output._temp[key] = value),
          _onFinish: ({ output }) => {
            output.result = output._temp.someKey;
          },
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj).toStrictEqual({
          result: inputObj.someKey,
        });
      });
    });

    describe('options object parameter', () => {
      it('works even if the user does not provide an options object', () => {
        const t = transformer();
        const outputObj = t();
        expect(outputObj).toStrictEqual({});
      });

      it('works even if the user provides an empty options object', () => {
        const t = transformer({}, {});
        const outputObj = t();
        expect(outputObj).toStrictEqual({});
      });

      it('works even if the user provides a null options object', () => {
        const t = transformer({}, null);
        const outputObj = t();
        expect(outputObj).toStrictEqual({});
      });

      it.each([
        {
          options: 'invalid rules parameter',
          parameterType: ' string',
        },
        {
          options: 1997,
          parameterType: ' number',
        },
        {
          options: ['an', 'array'],
          parameterType: 'n array',
        },
      ])(
        'gives a useful error message if the options parameter is not an object, but type $parameterType',
        ({ options, parameterType }) => {
          expect(() => transformer(null, options)).toThrowError(
            'options parameter is not an object, but a' + parameterType,
          );
        },
      );

      it('can use an omitRulelessKeys boolean option to leave out any keys that have no rules assigned', () => {
        const inputObj = {
          keyToKeep: 1,
          keyToIgnore: 2,
        };

        const rules = {
          keyToKeep: ({ output, key, value }) => (output[key] = value),
        };

        const options = {
          omitRulelessKeys: true,
        };

        const t = transformer(rules, options);
        const outputObj = t(inputObj);

        expect(outputObj).toStrictEqual({
          keyToKeep: 1,
        });
      });

      it('can use an omitEmptyStrings boolean option and pass to all rules', () => {
        const inputObj = {
          keyToKeep: 'some value',
          keyToIgnore: '',
        };

        const ignoreEmptyRule = ({ output, key, value, options }) => {
          if (
            typeof value === 'string' &&
            value.length === 0 &&
            options.omitEmptyStrings
          )
            return;
          output[key] = value;
        };

        const rules = {
          keyToKeep: ignoreEmptyRule,
          keyToIgnore: ignoreEmptyRule,
        };

        const options = {
          omitEmptyStrings: true,
        };

        const t = transformer(rules, options);
        const output = t(inputObj);

        expect(output).toStrictEqual({
          keyToKeep: 'some value',
        });
      });

      describe('pathSeparator', () => {
        it.each([
          {
            path: 'my.nested.path',
            options: {
              pathSeparator: '.',
            },
            expectedOutput: {
              'my.nested.path': 'my nested value',
            },
          },
          {
            path: 'my/nested/path',
            options: {
              pathSeparator: '/',
            },
            expectedOutput: {
              'my/nested/path': 'my nested value',
            },
          },
        ])(
          'can use a pathSeparator string option to customise nested key paths',
          ({ path, options, expectedOutput }) => {
            const inputObj = {
              my: {
                nested: {
                  path: 'my nested value',
                },
              },
            };

            const rules = {
              [path]: ({ output, key, value }) => (output[key] = value),
            };

            const t = transformer(rules, options);
            const outputObj = t(inputObj);

            expect(outputObj).toStrictEqual(expectedOutput);
          },
        );
      });

      describe('nestedInputKeys', () => {
        it('nestedInputKeys can be set to false to prevent use of nested object paths on the input object', () => {
          const inputObj = {
            my: {
              input: {
                path: 'my nested value',
              },
            },
            'my.input.path': 'my flat value',
          };

          const rules = {
            'my.input.path': ({ output, key, value }) => (output[key] = value),
          };

          const t = transformer(rules, {
            nestedInputKeys: false,
            omitRulelessKeys: true,
          });
          const outputObj = t(inputObj);

          expect(outputObj).toStrictEqual({
            'my.input.path': 'my flat value',
          });
        });
      });

      it('is passed to each rule function, so the user can assign arbitrary options to use in multiple rules', () => {
        const _onStart = vi.fn();
        const myKey = vi.fn(({ output, key, value }) => (output[key] = value));
        const _onFinish = vi.fn();

        const rules = {
          _onStart,
          myKey,
          _onFinish,
        };

        const options = {
          omitRulelessKeys: true,
          omitEmptyStrings: true,
          pathSeparator: '-',
          nestedInputKeys: false,
          nestedOutputKeys: false,
        };

        const input = {
          myKey: 'my value',
        };

        const t = transformer(rules, options);
        const output = t(input);

        expect(_onStart).toHaveBeenCalledTimes(1);
        expect(myKey).toHaveBeenCalledTimes(1);
        expect(_onFinish).toHaveBeenCalledTimes(1);

        expect(_onStart).toHaveBeenLastCalledWith({ output, input, options });
        expect(myKey).toHaveBeenLastCalledWith({
          input,
          output,
          key: 'myKey',
          value: 'my value',
          options,
        });
        expect(_onFinish).toHaveBeenLastCalledWith({
          output,
          input,
          options,
        });
      });
    });
  });
});

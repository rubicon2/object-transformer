import transformer from './object-transformer.mjs';
import { describe, it, expect } from 'vitest';

describe('object-transformer', () => {
  it('returns a function', () => {
    const t = transformer();
    expect(typeof t).toBe('function');
  });

  describe('returned function', () => {
    it('returns an object', () => {
      const t = transformer();
      expect(typeof t()).toBe('object');
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
        expect(outputObj).toEqual(inputObj);
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
        expect(outputObj).toEqual({
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

        expect(outputObj).toEqual({
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

        expect(outputObj).toEqual({
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

        expect(outputObj).toEqual({
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
            output.temp.titles = [...value];
          },
          years: ({ output, value }) => {
            output.temp.years = [...value];
          },
          mainChars: ({ output, value }) => {
            output.temp.mainChars = [...value];
          },
          _onFinish: ({ output }) => {
            const { titles, years, mainChars } = output.temp;
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

        expect(outputObj.temp).toBeUndefined();
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

        expect(outputObjA).toEqual({
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

        expect(outputObjB).toEqual({
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
          someKey: ({ output, key, value }) => (output.temp[key] = value),
          _onFinish: ({ output }) => {
            output.result = output.temp.someKey;
          },
        };

        const t = transformer(rules);
        const outputObj = t(inputObj);

        expect(outputObj).toEqual({
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

        expect(outputObj).toEqual({
          keyToKeep: 1,
        });
      });

      it('is passed to each rule function, so the user can assign arbitrary options to use in multiple rules', () => {
        const inputObj = {
          myKey: 97,
        };

        const rules = {
          _onStart: ({ output }) => (output.start = options.multiplier),
          myKey: ({ output, key, value, options }) =>
            (output[key] = value * options.multiplier),
          _onFinish: ({ output, options }) =>
            (output.final = output.myKey * options.multiplier),
        };

        const options = {
          multiplier: 2,
        };

        const t = transformer(rules, options);
        const outputObj = t(inputObj);

        expect(outputObj).toEqual({
          start: options.multiplier,
          myKey: 97 * options.multiplier,
          final: 97 * options.multiplier * options.multiplier,
        });
      });
    });
  });
});

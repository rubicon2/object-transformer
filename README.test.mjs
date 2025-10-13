import transformer, { copy, parseDate } from './index';
import { describe, it, expect } from 'vitest';

describe('README examples', () => {
  it('usage', () => {
    const rules = {
      'user.age': copy({ destinationKey: 'where.age', parser: parseInt }),
      'date.from': copy({
        destinationKey: 'where.date.gte',
        parser: parseDate,
      }),
      'date.to': copy({ destinationKey: 'where.date.lte', parser: parseDate }),
    };

    const input = {
      user: {
        age: '33',
      },
      date: {
        from: '2020-12-25',
        to: '2021-12-25',
      },
    };

    const myTransformer = transformer(rules);
    const output = myTransformer(input);

    // This will create the following output object.
    expect(output).toStrictEqual({
      where: {
        age: 33,
        date: {
          gte: new Date('2020-12-25'), // Date obj
          lte: new Date('2021-12-25'), // Date obj
        },
      },
    });
  });

  it('using the parser to create complex objects', () => {
    const rules = {
      name: copy({
        destinationKey: 'where.name',
        parser: (value) => ({ contains: value, mode: 'insensitive' }),
      }),
      date: copy({
        destinationKey: 'where',
        parser: (value) => ({ date: parseDate(value) }),
      }),
    };

    const input = {
      name: 'jimmy',
      date: '2020-12-25',
    };

    const myTransformer = transformer(rules);
    const output = myTransformer(input);

    expect(output).toStrictEqual({
      where: {
        name: {
          contains: 'jimmy',
          mode: 'insensitive',
        },
        date: new Date('2020-12-25'),
      },
    });
  });

  it('writing a custom rule', () => {
    // This just copies the value from the input object onto the output object.
    const myCustomRule = ({ output, key, value, options }) => {
      // Do not re-assign output itself like below - this will lose the reference to the original object.
      // output = { ...output, [key]: value }
      // But this is ok!
      output[key] = value;
    };

    const rules = {
      key1: myCustomRule,
      key2: myCustomRule,
    };

    const input = {
      key1: 'a',
      key2: 'b',
    };

    const output = transformer(rules)(input);
    expect(output).toStrictEqual(input);
  });

  it('writing a curried rule function', () => {
    // This copies the value from the input object and puts it on a different key on the output object.
    const copyToDifferentPath = (outputKey) => {
      // Don't need input key or options, so don't bother destructuring them.
      return ({ output, value }) => {
        output[outputKey] = value;
      };
    };

    const rules = {
      inputA: copyToDifferentPath('outputA'),
      inputB: copyToDifferentPath('outputB'),
    };

    const input = {
      inputA: 'first',
      inputB: 'second',
    };

    const output = transformer(rules)(input);
    expect(output).toStrictEqual({
      outputA: 'first',
      outputB: 'second',
    });
  });
});

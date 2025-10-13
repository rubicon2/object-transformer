import transformer, { copy, parseDate } from './index';
import { describe, it, expect, beforeEach } from 'vitest';

let outputObj;

beforeEach(() => {
  outputObj = {};
});

// Test to make sure all the stuff works together the way we want.
describe('object-transformer', () => {
  it('Re-implement url-query-to-prisma default find ruleset', () => {
    const prismaFindRules = {
      take: copy({ parser: parseInt }),
      skip: copy({ parser: parseInt }),
      cursor: copy({ destinationKey: 'cursor.id', parser: parseInt }),
      orderBy: copy({ destinationKey: 'temp.orderBy' }),
      sortOrder: copy({ destinationKey: 'temp.sortOrder' }),
      _onFinish: ({ output }) => {
        const { orderBy, sortOrder } = output.temp;
        // Make sure these are both in arrays so we don't have to program an array version and non-array version.
        const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
        const sortOrderArray = Array.isArray(sortOrder)
          ? sortOrder
          : [sortOrder];

        // The default value of each orderBy will be 'asc'!
        const orderByObj = {};
        for (const orderByItem of orderByArray) {
          orderByObj[orderByItem] = 'asc';
        }

        // Override orderBy value with that of sortOrder if one exists at the same array position.
        for (let i = 0; i < sortOrderArray.length; i++) {
          const currentSortOrderValue = sortOrderArray[i];
          const currentOrderByKey = orderByArray[i];
          if (currentOrderByKey) {
            orderByObj[currentOrderByKey] = currentSortOrderValue;
          } else {
            // If we have run out of orderBy values, there are more sortOrders than orderBys.
            // No more orderBys to match up to, so break out of the loop.
            break;
          }
        }

        const orderByFinalArr = Object.entries(orderByObj).map(
          ([key, value]) => ({ [key]: value }),
        );
        output.orderBy = orderByFinalArr;
      },
    };

    const t = transformer(prismaFindRules, {
      omitRulelessKeys: true,
    });
    // I.e. the body or query object on an express request object.
    const input = {
      take: '5',
      skip: '10',
      cursor: '25',
      orderBy: ['date', 'name'],
      sortOrder: 'desc',
      ignoreMe: 'this should not appear in the output',
    };
    outputObj = t(input);
    expect(outputObj).toStrictEqual({
      take: 5,
      skip: 10,
      cursor: { id: 25 },
      orderBy: [{ date: 'desc' }, { name: 'asc' }],
    });
  });

  it('Re-implement url-query-to-prisma usage example', () => {
    const rules = {
      title: copy({
        destinationKey: 'where.title',
        parser: (value) => ({ contains: value, mode: 'insensitive' }),
      }),
      author: copy({
        destinationKey: 'where.owner.name',
        parser: (value) => ({ contains: value, mode: 'insensitive' }),
      }),
      fromDate: copy({
        destinationKey: 'where.publishedAt.gte',
        parser: parseDate,
      }),
      toDate: copy({
        destinationKey: 'where.publishedAt.lte',
        parser: parseDate,
      }),
    };

    const options = {
      omitRulelessKeys: true,
      omitEmptyStrings: true,
    };

    // /blogs?title=myBlog&author=jimbo&fromDate=2020-01-01&toDate=2020-12-31
    const inputObj = {
      title: 'myBlog',
      author: 'jimbo',
      fromDate: '2020-01-01',
      toDate: '2020-12-31',
    };

    const t = transformer(rules, options);
    outputObj = t(inputObj);

    expect(outputObj).toStrictEqual({
      where: {
        title: {
          contains: 'myBlog',
          mode: 'insensitive',
        },
        owner: {
          name: {
            contains: 'jimbo',
            mode: 'insensitive',
          },
        },
        publishedAt: {
          gte: new Date('2020-01-01'), // Date object representing this date.
          lte: new Date('2020-12-31'), // Date object representing this date.
        },
      },
    });
  });

  it('Implement a hypothetical url-query-to-prisma update ruleset', () => {
    const prismaUpdateRules = {
      userId: copy({ destinationKey: 'where.id' }),
      firstName: copy({ destinationKey: 'data.firstName' }),
      lastName: copy({ destinationKey: 'data.lastName' }),
      age: copy({ destinationKey: 'data.age', parser: parseInt }),
      dob: copy({
        destinationKey: 'data.dob',
        parser: parseDate,
      }),
    };

    const t = transformer(prismaUpdateRules);
    const input = {
      userId: 'abc-123',
      firstName: 'Benjamin',
      lastName: 'Sisko',
      age: '43',
      dob: '1969-12-30',
    };
    outputObj = t(input);
    expect(outputObj).toStrictEqual({
      where: {
        id: 'abc-123',
      },
      data: {
        firstName: 'Benjamin',
        lastName: 'Sisko',
        age: 43,
        dob: new Date('1969-12-30'),
      },
    });
  });

  it.each([
    {
      testType: 'flat input key and flat destination key',
      rules: {
        'my.flat.key': copy({ destinationKey: 'some.different.flat.key' }),
      },
      options: {
        nestedInputKeys: false,
        nestedOutputKeys: false,
      },
      input: {
        'my.flat.key': 'my flat value',
      },
      expectedOutput: {
        'some.different.flat.key': 'my flat value',
      },
    },
    {
      testType: 'flat input key and nested destination key',
      rules: {
        'my.flat.key': copy({
          destinationKey: 'my.nested.key',
        }),
      },
      options: { nestedInputKeys: false },
      input: {
        'my.flat.key': 'my originally flat value',
      },
      expectedOutput: {
        my: {
          nested: {
            key: 'my originally flat value',
          },
        },
      },
    },
    {
      testType: 'nested input key and flat destination key',
      rules: {
        'my.nested.key': copy({
          destinationKey: 'my.flat.key',
        }),
      },
      options: { nestedOutputKeys: false },
      input: {
        my: {
          nested: {
            key: 'my originally nested value',
          },
        },
      },
      expectedOutput: {
        'my.flat.key': 'my originally nested value',
      },
    },
    {
      testType: 'nested input key and nested destination key',
      rules: {
        'my.nested.input.key': copy({
          destinationKey: 'my.nested.output.key',
        }),
      },
      options: {},
      input: {
        my: { nested: { input: { key: 'my nested value' } } },
      },
      expectedOutput: {
        my: { nested: { output: { key: 'my nested value' } } },
      },
    },
    {
      testType: 'flat input key used to create a nested output',
      rules: {
        'where.name': copy(),
        'where.age.lte': copy({ parser: parseInt }),
        'where.age.gte': copy({ parser: parseInt }),
        'data.contentFilter': copy({ parser: JSON.parse }),
      },
      options: { nestedInputKeys: false },
      input: {
        'where.name': 'hiro',
        'where.age.lte': '32',
        'where.age.gte': '26',
        'data.contentFilter': 'false',
      },
      expectedOutput: {
        where: {
          name: 'hiro',
          age: {
            lte: 32,
            gte: 26,
          },
        },
        data: {
          contentFilter: false,
        },
      },
    },
    {
      testType: 'nested input key used to create a flat output',
      rules: {
        'where.name': copy(),
        'where.age.lte': copy({ parser: String }),
        'where.age.gte': copy({ parser: String }),
        'data.contentFilter': copy({ parser: String }),
      },
      options: { nestedOutputKeys: false },
      input: {
        where: {
          name: 'hiro',
          age: {
            lte: 32,
            gte: 26,
          },
        },
        data: {
          contentFilter: false,
        },
      },
      expectedOutput: {
        'where.name': 'hiro',
        'where.age.lte': '32',
        'where.age.gte': '26',
        'data.contentFilter': 'false',
      },
    },
  ])(
    'with $testType, produces the correct results',
    ({ rules, options, input, expectedOutput }) => {
      const t = transformer(rules, options);
      expect(t(input)).toStrictEqual(expectedOutput);
    },
  );
});

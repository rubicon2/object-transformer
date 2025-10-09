import transformer, { copy, parseDate } from './index';
import { describe, it, expect, beforeEach } from 'vitest';

let outputObj;

beforeEach(() => {
  outputObj = {};
});

// Test to make sure all the stuff works together the way we want.
describe('object-transformer', () => {
  describe('Re-implement url-query-to-prisma', () => {
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
  });
});

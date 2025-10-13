# object-transformer

Turn one object into a differently formatted object, via user-defined rules. Can use nested paths.

## Install

```bash
npm install @rubicon2/object-transformer
```

## Usage

```js
import transformer, { copy, parseDate } from '@rubicon2/object-transformer';

const rules = {
  'user.age': copy({ destinationKey: 'where.age', parser: parseInt }),
  'date.from': copy({ destinationKey: 'where.date.gte', parser: parseDate }),
  'date.to': copy({ destinationKey: 'where.date.lte', parser: parseDate })
}

const input = {
  user: {
    age: '33'
  },
  date: {
    from: '2020-12-25',
    to: '2021-12-25'
  }
};

const myTransformer = transformer(rules);
const output = myTransformer(input);

// This will create the following output object.
output = {
  where: {
    age: 33,
    date: {
      gte: 2020-12-25T00:00:00.000Z
      lte: 2021-12-25T00:00:00.000Z
    }
  }
}
```

## Transformer Parameters

When a transformer is instantiated, it can be passed a rules object and an options object.

### Rules Parameter

This parameter should be of type object, and is used to contain rules for whatever input keys you want to process or manipulate. There are a few built-in special rules:

|Key|Description|
|-|-|
|```_onStart```|Runs before the user-defined rules begin running. Use this for any initialisation you might need.|
|```_onFinish```|Runs after the final user-defined rule has finished, but before the built-in _temp object has been deleted. Use this to tie up any input data that depends on each other. As the rules are held in an object, there is no guarantee as to what order the rules will be run in. Therefore, if you are writing a rule that depends on the values produced by another rule, it may be easier to simply store the values on ```output._temp[key]``` and then tie them together in whatever way you want within the ```_onFinish``` rule, since this is guaranteed to run after all the other rules are finished.|

### Options Parameter

This parameter should be of type object, and can utilise the following properties:

|Property|Default|Description|
|--------|-------|-----------|
|```omitRulelessKeys```|```false```|By default, any keys on the input object that don't match a rule will be copied over to the output as is. Set to true to ignore any input keys that do not have a rule explicitly set for them.|
|```omitEmptyStrings```|```false```|This does nothing internally on the transformer, but is passed along with the other options to each rule function. The rule function can then use it to do whatever. The named export ```copy``` function uses this to decide whether to keep empty strings or not.|
|```pathSeparator```|```'.'```|If nested input or output keys are being used, this will determine how the path segments are delineated. E.g. ```'my.nested.path'```, ```'my/nested/path'```.|
|```nestedInputKeys```|```true```|By default, a rule with a key of ```'my.nested.key'``` will look for a value in ```{ my: { nested: { key: 'my nested value' }}}``` on the input object, but if this is set to ```false```, the rule will look for the value in ```{ 'my.nested.key': 'my nested value' }```.|
|```nestedOutputKeys```|```true```|This does nothing internally on the transformer, but is passed along with the other options to each rule function. The rule function can then use it to do whatever. The named export ```copy``` function uses this to decide whether to use nested keys or flat keys, similarly to the transformer with the ```nestedInputKeys``` property.|

## Rule Functions

### Copy

For most purposes, the built-in ```copy``` rule can probably cover it. It can create nested output paths and parse the data with whatever parser you give it. It takes an object as its only parameter which can contain the following properties:

|Property|Default|Description|
|-|-|-|
|```parser```|```(v) => v```|This can be used to parse the input value into a different type. For example, you could use ```parseInt``` or ```parseFloat``` to get a number, ```String``` to parse the value into a string, ```JSON.parse``` to get boolean, arrays, or objects from strings, or import ```parseDate``` to easily parse a date value from a string. This can also be used to customise the result or if the value is of type object, include other properties.|
|```destinationKey```|```undefined```|If ```destinationKey``` is ```undefined```, the function will just use the input key.|
|```conflictHandler```|```undefined```|If  ```conflictHandler``` is ```undefined```, the ```deepMerge``` function will use its default, which puts non-object values on duplicate keys together into an array - zero data loss.|
|```options```|```{}```|This can be used to override any properties on the ```options``` passed to the rule function by the transformer. Useful for customising the ```pathSeparator```, ```omitEmptyStrings``` or ```nestedOutputKeys``` properties on a rule-by-rule basis.|

#### Using The Copy Parser to Create Complex Objects

The parser can be used for more than processing a string into another type. Consider the below:

```js
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
// Result:
// where: {
//   name: {
//     contains: 'jimmy',
//     mode: 'insensitive',
//   },
//   date: new Date('2020-12-25'),
// };
```

### Writing a Custom Rule

If copy doesn't cover it, you can write your own rule like the following:

```js
// This just copies the value from the input object onto the output object.
const myCustomRule = ({ output, key, value, options }) => {
  // Do not re-assign output itself like below - this will lose the reference to the original object.
  // output = { ...output, [key]: value }
  // But this is ok!
  output[key] = value;
}

const rules = {
  key1: myCustomRule,
  key2: myCustomRule
}

const input = {
  key1: 'a',
  key2: 'b',
}

const output = transformer(rules)(input);
// Result:
// output = {
//   key1: 'a',
//   key2: 'b',
// }
```

The parameters are passed to the function by the transformer. The output object is the final object returned by the transformer, the key and value are taken from the input object, and the options include any you provided when instantiating the transformer.

It is useful to curry functions to customise behaviour and do more complicated manipulations:

```js
// This copies the value from the input object and puts it on a different key on the output object.
const copyToDifferentPath = (outputKey) => {
  // Don't need input key or options, so won't bother destructuring them.
  return ({ output, value }) => {
    output[outputKey] = value;
  }
}

const rules = {
  inputA: copyToDifferentPath('outputA'),
  inputB: copyToDifferentPath('outputB')
}

const input = {
  inputA: 'first',
  inputB: 'second',
}

const output = transformer(rules)(input);
// Result:
// output = {
//   outputA: 'first',
//   outputB: 'second'
// }
```

## The _temp Object

When the object transformer starts processing the input, the output will be initialised to the following:

```js
let output = {
  _temp: {}
};
```

This ```_temp``` object can be used to store any values you might need to keep from one rule to another, or to use within the ```_onFinish``` function, which runs after all user-defined rules but before the ```_temp``` object is removed. If one rule depends on data collected from another rule, instead of writing code that branches depending on whether the data has been collected or not, it would be simpler just to assign the data to a key on the ```_temp``` object, and then do whatever needs to be done within the ```_onFinish``` function.

The ```_temp``` object is prefixed with an underscore (like ```_onStart``` and ```_onFinish```) to indicate that it is used internally and cleared at the end of the function, and to reduce the likelihood of naming conflicts with user-defined output object keys.

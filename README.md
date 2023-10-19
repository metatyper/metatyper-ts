<p align="center">
    <img src="logo.png" align="center" alt="MetaTyper" />
    <hr/>
    <p align="center"><i>use built-in features to do more</i></p>
</p>

<br/>

## Introduction

The MetaTyper project is a new approach to using types in TypeScript and JavaScript code.
It is based on the principle of using classical classes or objects as a data schema for further validation and serialization.
The goal of the project is to make runtime types as developer-friendly as possible.

Killer Features:

- Built-in TypeScript/JS support. Your schema is already a classic TypeScript/JS object.
- Rich extensibility support. You can add your own types with validation and serialization. Moreover you can extend the logic of built-in types.

More Facts:

- Works in Node.js and all modern browsers.
- Works with native JavaScript.
- Zero dependencies in JavaScript source code.
- Rich error details. You can get all the information about your error.
- It's tiny. 8kb minified + zipped.

<br/>

## Table of Contents

- [Introduction](#introduction)
- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Guides](#guides)
  - [Basic usage](#basic-usage)
  - [Meta objects](#meta-objects)
    - [Meta](#meta)
    - [Meta.isMetaObject](#metaismetaobject)
    - [Meta.Class decorator](#metaclass-decorator)
    - [Meta args](#meta-args)
    - [Meta inheritance](#meta-inheritance)
    - [Meta copy](#meta-copy)
  - [Meta types](#meta-types)
    - [MetaType](#metatype)
    - [MetaType Implementation](#metatype-implementation)
    - [MetaTypeArgs](#metatypeargs)
  - [Built-in meta types](#built-in-meta-types)
    - [ANY](#any)
    - [ANY\_OF](#any_of)
    - [ARRAY](#array)
    - [EXACT\_ARRAY](#exact_array)
    - [OBJECT](#object)
    - [LITERAL](#literal)
    - [BOOLEAN](#boolean)
    - [STRING](#string)
    - [NUMBER](#number)
    - [INTEGER](#integer)
    - [BIGINT](#bigint)
    - [DATE](#date)
  - [Validation](#validation)
    - [Validators](#validators)
    - [Validation Methods](#validation-methods)
    - [Disable Validation](#disable-validation)
  - [Serialization](#serialization)
    - [Serializers](#serializers)
    - [Serialization/Deserialization Methods](#serializationdeserialization-methods)
    - [Disable Serialization/Deserialization](#disable-serializationdeserialization)
  - [Json Schema](#json-schema)
  - [Errors](#errors)
    - [MetaTypeSerializationError](#metatypeserializationerror)
    - [MetaTypeValidationError](#metatypevalidationerror)
    - [TypeBuildError](#typebuilderror)
- [Similar libraries](#similar-libraries)
- [Changelog](#changelog)
  - [metatyper@0.1.0](#metatyper010)
- [ToDo](#todo)

<br/>

## Installation

```bash
npm install metatyper
```

or

```bash
yarn add metatyper
```

or

```html
<!-- last version -->
<script src='https://www.unpkg.com/metatyper/lib/metatyper.min.js'></script> 

<!-- or a specific version -->
<script src='https://www.unpkg.com/metatyper@0.1.0/lib/metatyper.min.js'></script> 
 
<!-- or another cdn -->
```


<br/>

## Guides

### Basic usage

First of all, you can create a Meta object from your old object.

```ts
import { Meta } from 'metatyper'

const oldObj = {
    id: 0,
    username: '',
    stars: 0
}

const metaObj = Meta(oldObj) // this metaObj is almost equal to oldObj

metaObj['stars'] = 'some text' as any // validation error

Object.assign(metaObj, {
    id: 0,
    username: {} // validation error
})
```

You can also customize the meta object using different Meta types.  

```ts
import { Meta, NUMBER } from 'metatyper'

const PositiveNumberValidator = {
    name: 'PositiveNumber',
    validate({ value }) {
        return typeof value === 'number' && value > 0
    }
}

const obj1 = Meta({
    id: 0, // will use Meta type: NUMBER
    username: '',
    stars: NUMBER({
        default: 1,
        validators: [PositiveNumberValidator]
    })
})

obj1['stars'] = -2 // validation error

Object.assign(obj1, {
    id: 0,
    username: {} // validation error
})
```

You can also work with class instead of objects.

```ts
import { Meta, NUMBER, STRING } from 'metatyper'

const LowerStringValidator = {
    name: 'LowerString',
    validate: ({ value }) => !value || value === value.toLowerCase()
}

@Meta.Class({
    propsIgnore: [ 'someAnotherClassFlag' ],
    instanceArgs: {
        propsIgnore: [ 'someInstanceField' ]
    }
})
class MyOldClass {
    id = NUMBER({ default: 0 }) // default 0
    username = STRING({ validators: [LowerStringValidator] }) // default null
    stars = 0
    someInstanceField = 0

    static someClassFlag = true
    static someAnotherClassFlag = true
}

const instance = new MyOldClass()

instance.id = 1 // ok
instance.id = 'a' as any // validation error
instance.username = 'Abc' // validation error (LowerStringValidator)

Object.assign(instance, {
    id: 2,
    username: 0, // ok, will cast to '0'
    stars: 'str', // validation error,
    someInstanceField: '1' // ok, because the field in the propsIgnore
})

MyOldClass.someFlag = 'string' as any // validation error
MyOldClass.someAnotherClassFlag = 'string' as any // ok, because the field in the propsIgnore
```

<br/>

### Meta objects

#### Meta

To work with Meta types it is convenient to use Meta objects.
A Meta object is a proxy object that changes the logic of reading and writing values to the object's properties.

Example:

```ts
const objA = {
    a: 1
}
const metaObjA = Meta(objA)

// will throw a validation error because this property has been initialized number
metaObjA['a'] = 'str' 

const metaObjB = Meta()
metaObjB['a'] = 'str'

// will throw a validation error because this property has been initialized string
metaObjB['a'] = 2 
```

Since classes are more often used to describe properties, this library provides Meta classes. The difference from Meta objects is that instances of the class will also be Meta objects.

Example:

```ts
class A {
    a = 'string'

    static a = 2
}

const MetaA = Meta(A)  // similar to the @Meta.Class() decorator

// will throw a validation error because this property was initialized number
MetaA['a'] = 'str' 

const metaInstanceA = new MetaA()

// will throw a validation error because this property was initialized 'string'
metaInstanceA['a'] = 1 
```

<br/>

#### Meta.isMetaObject

If you need to check if an object is a meta object, you can use this method: `Meta.isMetaObject(obj)`

<br/>

#### Meta.Class decorator

Decorator does the same thing as `Meta(A)`.

Example:

```ts
@Meta.Class()  // Meta.Class(args) has arguments as in Meta(args)
class MetaA {
    a = 'string'

    static a = 2
}

// will throw a validation error because this property was initialized number
MetaA['a'] = 'str'

const metaInstanceA = new MetaA()

// will throw a validation error because this property was initialized 'string'
metaInstanceA['a'] = 1
```

<br/>

#### Meta args

Meta function has the following arguments

```ts
function Meta<T extends object>(base: T, args?: MetaArgs): T
```

```ts
type MetaArgs = {
    // meta object name (used in toString)
    name?: string

    // enable default js logic for properties
    propertiesIgnore?: string[]

    // disable all validators
    disableValidation?: boolean 

    // disable all serializers
    disableSerialization?: boolean 

    // The Meta object will not have a prototype
    disableInheritance?: boolean

    // MetaTypeArgs for configuring all Meta types
    metaTypesDefaultArgs?: MetaTypeArgs | ((metaTypeImpl: MetaTypeImpl) => MetaTypeArgs)
}
```

<br/>

#### Meta inheritance

Meta objects support the extension of classic objects with an additional side effect.
When you extend your object with a Meta object, your object becomes a Meta object.

The following shows some use cases of inheritance:

```ts
import { Meta, NUMBER, STRING } from 'metatyper'

const obj1 = {
    a: 1,
    b: NUMBER()
}

const obj2 = {
    c: 2,
    d: STRING()
}

Object.setPrototypeOf(obj2, obj1)

const metaObj2 = Meta(obj2)

metaObj2['a'] = 'a' // validation error
metaObj2['c'] = 'a' as any // validation error

const metaObj3 = {
    e: NUMBER({ default: 1 })
}

Object.setPrototypeOf(metaObj3, metaObj2)

console.log(metaObj3) // it is not Meta object
// { e: NUMBER }
```

> Meta object extends base obj: `Object.getPrototypeOf(metaObj2) === obj2`

```ts
import { Meta, NUMBER, STRING } from 'metatyper'

class Base {
    base = 1
    static base = 2
}

@Meta.Class()
class A extends Base {
    static a = NUMBER()
    a = NUMBER()
}

class B extends A {
    static b = NUMBER()
    b = NUMBER()
}

@Meta.Class()
class C extends B {
    static c = NUMBER()
    c = NUMBER()
}

const aInstance = new A()
const bInstance = new B()
const cInstance = new C()

console.log(A.toString())
// [meta class A] { a: NUMBER = null }

console.log(B.toString())
// [class B extends Meta] { b = NUMBER }

console.log(C.toString())
// [meta class C] { c: NUMBER = null; [a]: NUMBER = null; [b]: NUMBER = null }

// brackets [a] mean that property a is a property of the parent class
// there is no `base` property
// because the Base class is not a Meta class and its properties are ignored
// but these properties are still available in the prototype
// (they can be used without Meta-logic)

console.log(aInstance.toString())
// [meta instance A] { a: NUMBER = null; base: NUMBER = 1 }

console.log(bInstance.toString())
// [meta instance B] { a: NUMBER = null; b: NUMBER = null; base: NUMBER = 1 }

console.log(cInstance.toString())
// [meta instance C] { a: NUMBER = null; b: NUMBER = null; base: NUMBER = 1; c: NUMBER = null }

// There are no [a] brackets in instances,
// as these properties are intrinsic (see how instance creation works)
```

> Unlike simple objects, instances have Meta properties of their parent classes.

> Static classes work as simple Meta objects.

<br/>

#### Meta copy

In some cases it is necessary to create a copy of an object.
You can use the `Meta(obj?: object, args?: MetaArgs)` method to create a copy of an object, but the prototype chain will include the object.
If you need to create a real copy of an object, you can call the `Meta.copy(obj: object, args?: MetaArgs)` method.  
The main difference is that the new obj will inherit from `Object.getPrototypeOf(obj)` rather than from `obj` itself.

Example:

```ts
import { Meta } from 'metatyper'

const obj = {
    someField: 1
}

const metaObj1 = Meta(obj)
const metaObj2 = Meta(metaObj1)
const metaObj3 = Meta.copy(metaObj1)

console.log(Object.getPrototypeOf(metaObj1) === obj)
console.log(Object.getPrototypeOf(metaObj2) === metaObj1)
console.log(Object.getPrototypeOf(metaObj3) === obj)
```

<br/>

### Meta types

#### MetaType

Meta types extend built-in types, but they have more features.
The main functions of types are:

- validation.
- serialization.
- type conversion based on serialization.
- static type checking.

In addition, Meta types can generate a schema and select the necessary type for a certain value.

Meta types are an object consisting of flags, references to the type implementation, and special methods.

```ts
const metaType = {
    [IsMetaTypeSymbol]: true
    [MetaTypeSymbol]: /*metaType - recursion*/
    [MetaTypeImplSymbol]: metaTypeImpl

    [Symbol.for('nodejs.util.inspect.custom')](): string
    toString(): string

    serialize(value: any): any
    deserialize(value: any): any
    validate(value: any): boolean  // throw MetaTypeValidationError
    parse(value: any): any // will deserialize and validate

    get schema(): JSONSchema7
}
```

The basic logic of meta types is in metaTypeImpl.
In order to use Meta types, you need to use type methods or most likely Meta object methods.

<br/>

#### MetaType Implementation

Meta type implementation example:

```ts
import { Meta, MetaType, StringImpl } from 'metatyper'

export type LowerCaseString = MetaType<Lowercase<string>>

export function LowerCaseString(serialize = true) {
    class LowerCaseStringImpl extends StringImpl {
        name = 'LowerCaseString'

        // value type check
        isMetaTypeOf(value: string) {
            if (!super.isMetaTypeOf(value)) {
                return false
            }

            return !/[A-Z]/.test(value)
        }

        // deserialize value
        castToType({ value }) {
            if (!serialize) return value

            return value ? (value?.toLowerCase && value.toLowerCase()) ?? value : null
        }
    }

    return MetaType<LowerCaseString>(LowerCaseStringImpl.build())
}

// =====================================================================

@Meta.Class()
class MyNewExample {
    str = LowerCaseString()
    strWithoutSerialization = LowerCaseString(false)
}

const instance = new MyNewExample()

// ok, the castToType method will change this value to 'abc'
instance.str = 'aBc' as any

// ok
instance.strWithoutSerialization = 'a'

// [meta instance MyNewExample]
// { str: LowerCaseString = abc; strWithoutSerialization: LowerCaseString = a }
console.log(instance)

instance.strWithoutSerialization = 'aBc' // type and validation error
```

Among the available implementation methods and properties are the following:

```ts
// make a new implementation instance and configure it
static build<T extends MetaTypeImpl>(this: new (...args: any) => T, args?: MetaTypeArgs): T
```

```ts
// to configure this implementation. You can add your own configurations
protected configure(_args?: MetaTypeArgs): void
```

```ts
// deserialize value, 
// use as a serializer when setting a property value or when deserializing obj
castToType(args: SerializationArgType): any
```

```ts
// serialize value, used only when serializing obj
castToRawValue(args: SerializationArgType): any
```

```ts
// serialize the value using all serializers
serialize(
    value: any,
    args?: {
        place?: SerializePlaceType
        targetObject?: object
        propName?: string
    }
): any
```

```ts
// deserialize the value using all serializers
deserialize(
    value: any,
    args?: {
        place?: DeSerializePlaceType
        targetObject?: object
        propName?: string
    }
): any
```

```ts
// validate the value with all validators
validate(
    value: any,
    args?: {
        targetObject?: object
        propName?: string
    }
): boolean
```

```ts
// check if the value is compatible with the Meta type implementation instance
isMetaTypeOf(value: any) {
    return this.constructor.isCompatible(value)
}
```

```ts
// you can register your Meta type implementation class to search by value in getMetaType
static registerMetaType(type: StaticClass<typeof MetaTypeImpl>): void
```

```ts
// check if the value is compatible with the Meta type implementation class
static isCompatible(_value: any) {
    return false
}
```

```ts
// score to sort registered compatible Meta type implementations in getMetaType
// for example, you can register a new implementation for the built-in string
static getCompatibilityScore(_value: any) {
    return -1
}
```

```ts
// find a registered Meta type implementation class 
// compatible with your value and call MetaType(metaTypeImplClass.build(args))
static getMetaType<T>(valueToFind: T, args?: MetaTypeArgs): MetaType<unknown, MetaTypeImpl>
```

```ts
// like getMetaType, 
// but return just implementation instance: metaTypeImplClass.build(args)
static getMetaTypeImpl<T>(valueToFind: T, args?: MetaTypeArgs): MetaTypeImpl
```

To learn more about the principles of Meta types creation, you can explore the [source code](/src/metatypes/types) of the built-in Meta types.

<br/>

#### MetaTypeArgs

The Meta type has only one argument: `implementationInstance`.

```ts
// StringImpl.build will create a new configured instance
const newType = MetaType(StringImpl.build())
```

`MetaTypeImpl.build(args: MetaTypeArgs)` also has one argument, but with many options:

```ts
type MetaTypeArgs<T = any> = {
    // override Meta type name (name used in description/inspection)
    name?: string  

     // json schema 
     // (you can get the entire schema of an object by calling Meta.getJsonSchema(obj))
    schema?: SchemaType 

    // this is sub value / Meta type used for nested object types
    subType?: any 

    // default value (instead of null)
    default?: T  

    // add a NullableValidator that checks for a null value
    nullable?: boolean  

    // validator array 
    // (validators check a value when an object property is assigned that value)
    validators?: ValidatorType[]  

    // array of serializers 
    // (Serializers are used for Meta.serialize(obj) and Meta.deserialize(obj))
    serializers?: SerializerType[]  

    // disable validators 
    //that the Meta type implementation instance has in the defaultValidators property
    noDefaultValidators?: boolean  

    // disable serializers 
    // that the Meta type implementation instance has in the defaultSerializers property
    noDefaultSerializers?: boolean  

    // disable the validators, which all Meta types have (MetaTypeValidator)
    noBuiltinValidators?: boolean 

    // disable serializers, which all Meta types have (AutoCast)
    noBuiltinSerializers?: boolean 

    // default arguments used to build all subtypes (could be a function)
    subTypesDefaultArgs?: MetaTypeArgs | ((metaTypeImpl: MetaTypeImpl) => MetaTypeArgs)
}
```

<br/>

### Built-in meta types

Each built-in Meta type has `args?: MetaTypeArgs` at the end of arguments. How to use it you can see above.

<br/>

#### ANY

```ts
import { ANY } from 'metatyper' 

const obj = Meta({ 
    someField: ANY({/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: any
}
*/

let someVar: ANY  // this is equal to `any`

```

<br/>

#### ANY_OF

```ts
import { ANY_OF, BOOLEAN } from 'metatyper' 

const obj = Meta({ 
    someField: ANY_OF([1, 'string', BOOLEAN()], {/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: number | string | boolean
}
*/

let someVar: ANY_OF<1 | string | BOOLEAN>  // this is equal to `1 | string | boolean`

```

<br/>

#### ARRAY

```ts
import { ARRAY, BOOLEAN } from 'metatyper' 


const obj = Meta({ 
    someField: ARRAY(
        [1, 'string', BOOLEAN()], 
        { notEmpty: true, /*MetaTypeArgs*/}
    ),
    anotherField: ARRAY(BOOLEAN(), {/*MetaTypeArgs*/}),
})
/*
obj type is equal to 
{
    someField: (number | string | boolean)[]
    anotherField: boolean[]
}
*/

let someVar: ARRAY<1 | string | BOOLEAN>  // this is equal to `(1 | string | boolean)[]`

```

> notEmpty option will add `NotEmptyArray` validator as `runtime` validator and `minItems: 1` to a json schema

<br/>

#### EXACT_ARRAY

```ts
import { EXACT_ARRAY, BOOLEAN } from 'metatyper' 


const obj = Meta({ 
    someField: EXACT_ARRAY([1, 'string', BOOLEAN()], {/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: [number, string, boolean]
}
*/

let someVar: EXACT_ARRAY<[1, string, BOOLEAN]>  // this is equal to `[1, string, boolean]`
```

<br/>

#### OBJECT

```ts
import { OBJECT, BOOLEAN } from 'metatyper' 


const obj = Meta({ 
    someField: OBJECT({
        a: 1,
        b: 'string',
        c: BOOLEAN(),
        d: {
            e: 'string'
        }
    }, {/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: {
        a: number
        b: string
        c: boolean
        d: {
            e: string
        }
    }
}
*/

// this is equal to `{ a: 1; b: string; c: boolean }`
let someVar: OBJECT<{ a: 1; b: string; c: BOOLEAN }>  

```

<br/>

#### LITERAL

```ts
import { LITERAL, BOOLEAN } from 'metatyper' 


const obj = Meta({ 
    someField: LITERAL(1, {/*MetaTypeArgs*/}),
    anotherFiled: LITERAL(BOOLEAN(), {/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: 1
    anotherField: boolean
}
*/

let someVar: LITERAL<1>  // this is equal to `1`

```

<br/>

#### BOOLEAN

```ts
import { BOOLEAN } from 'metatyper' 

const obj = Meta({ 
    someField: BOOLEAN({/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: boolean
}
*/

let someVar: BOOLEAN  // this is equal to `boolean`

```

<br/>

#### STRING

```ts
import { STRING } from 'metatyper' 

const obj = Meta({ 
    someField: STRING({/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: string
}
*/

let someVar: STRING  // this is equal to `string`

```

<br/>

#### NUMBER

```ts
import { NUMBER } from 'metatyper' 

const obj = Meta({ 
    someField: NUMBER({/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: number
}
*/

let someVar: NUMBER  // this is equal to `number`

```

<br/>

#### INTEGER

```ts
import { INTEGER } from 'metatyper' 

const obj = Meta({ 
    someField: INTEGER({/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: number
}

but this field has validator that validate on integer value
*/

let someVar: INTEGER  // this is equal to `number`

```

<br/>

#### BIGINT

```ts
import { BIGINT } from 'metatyper' 

const obj = Meta({ 
    someField: BIGINT({/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: bigint
}
*/

let someVar: BIGINT  // this is equal to `bigint`

```

<br/>

#### DATE

```ts
import { DATE } from 'metatyper' 

const obj = Meta({ 
    someField: DATE({/*MetaTypeArgs*/})
})
/*
obj type is equal to 
{
    someField: Date
}
*/

let someVar: DATE  // this is equal to `Date`

```

<br/>

### Validation

There are two ways of validation: type validation and object validation. In fact, when validating an object, each of its properties is validated.
Type validation is based on Meta type validators.

For validation errors, see the [Errors section](#errors)

<br/>

#### Validators

Validator is an object with a method `validate(args: ValidationArgType): boolean` and a `name` field (optional).

 ```ts
type ValidationArgType = {
    metaTypeImpl: MetaTypeImpl
    value: any
    propName?: string
    targetObject?: object
}
```

Example:

```ts
import { ValidationArgType } from 'metatyper'

const MyValidator = { 
    name: 'MyValidator', 
    validate({metaTypeImpl, value, propName, targetObject}: ValidationArgType) {
        console.log(metaTypeImpl, value, propName, targetObject)

        return true
    } 
}
```

Each Meta type has 3 types of validators:

1. built-in: there is currently one MetaTypeValidator, which uses the result of the isMetaTypeOf method
2. default: they are configured when creating a Meta type by adding validators to the defaultValidators property of the Meta type implementation instance
3. at runtime: passed through the Meta type arguments

Here are 3 examples of customizing validators in a Meta type:

```ts
const MyValidator1 = {
    name: 'MyValidator1',
    validate({ metaTypeImpl, value, propName, targetObject }) {
        console.log('MyValidator1', metaTypeImpl, value, propName, targetObject)

        return value !== null
    }
}

const MyValidator2 = {
    name: 'MyValidator2',
    validate({ metaTypeImpl, value, propName, targetObject }) {
        console.log('MyValidator2', metaTypeImpl, value, propName, targetObject)

        return value !== 0
    }
}

class MyMetaTypeImpl extends MetaTypeImpl {
    protected configure(args?: MetaTypeArgs) {
        this.defaultValidators.push(MyValidator1)
    }

    isMetaTypeOf(value: any) {
        return typeof value === 'number'
    }
}

function MyType(args: MetaTypeArgs<number>) {
    return MetaType<number>(MyMetaTypeImpl.build(args))
}

@Meta.Class()
class MyClass1 {
    myProp = MyType({ validators: [MyValidator2] })
}

const myInstance = new MyClass1()

// validation error: myProp cannot be null, MyValidator2 checks for it
myInstance.myProp = 0

// validation error: myProp can not be string,
// built-in MetaTypeValidator(isMetaTypeOf) checks for it
myInstance.myProp = '1' as any
```

<br/>

#### Validation Methods

Validation can be performed either by assigning a value to an object property or by calling certain methods.
The following methods can be used for validation:

- `Meta.validate(metaObj, rawObj)` - will validate rawObj according to the Meta object types
- `MetaType(impl).validate(someValue)` - will validate the value

<br/>

#### Disable Validation

You can also disable validation in a number of ways:

Way 1

```ts
Meta.validationIsActive(metaObj) === true

Meta.disableValidation(metaObj)

Meta.validationIsActive(metaObj) === false

metaObj.myProp = 0 // ok

Meta.enableValidation(metaObj)
```

Way 2

```ts
@Meta.Class()
class MyClass2 {
    myProp = MyType({ 
        validators: [], // just make it empty
        noDefaultValidators: true, // disable default validator: MyValidator1
        noBuiltinValidators: true  // disable built-in validator: MetaTypeValidator
    })
}
```

<br/>

### Serialization

As with the serialization checker, there are two ways to do this.
Similarly, when an object is serialized, each of its properties is serialized.
Type serialization is based on Meta type serializers.

<br/>

#### Serializers

A serializer is an object that has 2 methods: `serialize(args: SerializationArgType): any` and `deserialize(args: SerializationArgType): any`

```ts
type SerializationArgType = {
    metaTypeImpl: MetaTypeImpl
    value: any
    propName?: string
    targetObject?: object
}
```

Also serializer can have three fields:

- `name: string` (name will be used for serialization errors)
- `serializePlaces: SerializePlaceType[]` (places where serialization will work, more details below)
- `deserializePlaces: DeSerializePlaceType[]` (places where deserialization will work, more on this below)

When serializing a Meta type, the serializers that take part based on `serializePlaces` and `deserializePlaces` are filtered.
Depending on where serialize/deserialize was called, certain serializers will be selected.
Here are the possible places where serialization was called and simultaneously the possible values of `serializePlaces` and `deserializePlaces` arrays:

```ts
type SerializePlaceType = 'get' | 'serialize'
type DeSerializePlaceType = 'init' | 'set' | 'deserialize'
```

- `get` - serialization when obtaining the value of an object property (`metaObj1['someKey']`)
- `serialize` - serialization when calling serialize methods of a Meta type or in a Meta (e.g. `Meta.serialize`)

- `init` -deserialization during Meta object initialization
- `set` - deserialization during value assignment (or `Object.defineProperty` call)
- `deserialize` - deserialization when calling deserialize methods of a Meta type or in a Meta (e.g. `Meta.deserialize`)

> AutoCast serializer has specific place configurations: serializePlaces: ['serialize'],
> i.e. castToRawValue will only work when calling the serialization method and will not work when you get the value of an object's property.

Each Meta type has 3 types of serializers:

1. built-in: there is currently one serializer AutoCast, which is serialize/deserialize value via methods like: castToType (deserialize) and castToRawValue (serialize)
2. default: they are configured when creating a Meta type by adding serializers to the defaultSerializer property of the Meta type implementation instance
3. runtime: passed through the type instance arguments

Here is an example of setting up serializers in a Meta type:

```ts
import { Meta, MetaType, MetaTypeImpl, MetaTypeArgs } from 'metatyper'


const MySerializer1 = {
    name: 'MySerializer1',
    serialize({ value }) {
        return value
    },
    deserialize({ value }) {
        return value
    },

    // optional
    serializePlaces: ['get', 'serialize'],
    deserializePlaces: ['init', 'set', 'deserialize']
}

const MySerializer2 = {
    name: 'MySerializer2',
    serialize({ value }) {
        return value
    },
    deserialize({ value }) {
        return value
    }
}

class MyMetaTypeImpl extends MetaTypeImpl {
    protected configure() {
        this.defaultSerializers.push(MySerializer1)
    }

    castToType({ value }) {
        return value
    }

    castToRawValue({ value }) {
        return value
    }

    isMetaTypeOf() {
        return true
    }
}

function MyType(args: MetaTypeArgs<number>) {
    return MetaType<number>(MyMetaTypeImpl.build(args))
}

@Meta.Class()
class MyClass1 {
    myProp = MyType({ serializers: [MySerializer2] })
}

// use serializers with `init` in the `deserializePlaces` property
const myInstance = new MyClass1()

// use serializers with `set` in the `deserializePlaces` property
myInstance.myProp = 0

// use serializers with `deserialize` string in the `deserializePlaces` property
Meta.deserialize(myInstance, {
    myProp: 1
})

// use serializers with `get` in the `serializePlaces` property
const var1 = myInstance.myProp

console.log(var1) // 1

// use serializers with `serialize` in the `serializePlaces` property
console.log(Meta.serialize(myInstance)) // { myProp: 1 }
```

<br/>

#### Serialization/Deserialization Methods

Serialization can be performed either by assigning a value to an object property or by calling certain methods.
The following methods can be used for serialization:

- `Meta.serialize(obj)` - will return a plain js object
- `Meta.deserialize(obj, raw)` - will update the values of the object according to the values from the plain js of the raw object
- `MetaType(impl).serialize(someValue)` - will return the serialized value
- `MetaType(impl).deserialize(someValue)` - will return the deserialized value

<br/>

#### Disable Serialization/Deserialization

If you need to turn off serialization of an object, you can use several ways to achieve the goal:

Way 1

```ts
Meta.serializersIsActive(myInstance) === true

Meta.disableSerializers(myInstance)

Meta.serializersIsActive(myInstance) === false

myInstance.myProp = 0 // without deserialization

Meta.enableSerializers(myInstance)
```

Way 2

```ts
@Meta.Class()
class MyClass2 {
    myProp = MyType({ 
        serializers: [], // just make it empty
        noDefaultSerializers: true, // disable default serializers
        noBuiltinSerializers: true  // disable built-in serializer: AutoCast
    })
}
```

<br/>

### Json Schema

You can also get the json schema for Meta objects and Meta types.

To get the schema of an object, you need to call the `Meta.getJsonSchema(metaObj)` method.
You can get the schema of a Meta type simply through the type realization property `MyType().schema`.

Json-schema is no used in the project, and if you want to perform validation via schema in js, you need to install and use the `json-schema` package (or similar).

<br/>

### Errors

> All project's errors extend `MetaError`

There are 3 errors that you can catch:

<br/>

#### MetaTypeSerializationError

An error will occur if serialization/deserialization is executed with an error

MetaTypeSerializationError is inherited from MetaError and besides the default properties has the following properties

1. `readonly targetObject?: object` - object in which serialization was failed (may be null if serialization was done outside the object, e.g. `MyType().parse('value')`)
2. `readonly metaTypeImpl: MetaTypeImpl` - implementation instance of the Meta type that caused this error
3. `readonly serializer: SerializerType` - serializer that returned the error
4. `readonly propName?: string` - name of the property for which serialization failed (only if an object was serialized)
5. `readonly value: any` - value for which serialization failed (it should be taken into account that this value is after previous serializers)
6. `readonly place: SerializePlaceType | DeSerializePlaceType` - the place where serialization/deserialization was invoked
7. `readonly subError: Error` - error that was caused during serialization

<br/>

#### MetaTypeValidationError

The error will be thrown when any Meta type validator returns false or throw an error

MetaTypeValidationError is inherited from MetaError and besides the default properties has the following properties:

1. `readonly targetObject?: object` - object in which validation was failed (may be null if validation was done outside the object, e.g. `MyType().validate('value')`)
1. `readonly metaTypeImpl: MetaTypeImpl` - implementation instance of the Meta type that caused this error
1. `readonly validator: ValidatorType` - validator that returned false or throw an error
1. `readonly propName?: string` - name of the property for which validation failed (only if an object was validated)
1. `readonly value: any` - value for which validation failed (it should be taken into account that this value is after all serializers)
1. `readonly subError?: Error` - error that was caused during validation

<br/>

#### TypeBuildError

This error occurs in built-in Meta types when it is impossible to create a Meta type.
As an example, this error will be thrown if an argument that is not an object is passed to the OBJECT() Meta type:
`OBJECT(1) -> throw new TypeBuildError('subType is not object', ObjectImpl)`.

TypeBuildError inherits from MetaError and besides the default properties has a property metaTypeImplCls - a reference to the Meta type implementation class

<br/>

## Similar libraries

There are several other widely used similar good libraries.
MetaTyper is yet another library that solves similar, but more specific problems.
If you need a more general way of working with data, MetaTyper will more than suit you.
If you need more specific features,
then you can use any of the libraries for validation (e.g. zod) / types (e.g. type-fest).
You can also take the best of several libraries and write really great code.

These libs are worth a look:

- type-fest
- ts-toolbelt
- zod
- runtypes
- joi
- yup
- io-ts
- ow

<br/>

## Changelog

### metatyper@0.1.0

- Init release

<br/>

## ToDo

1. implement more popular validators and serializers.
2. implement additional tests.
3. rewrite docs.

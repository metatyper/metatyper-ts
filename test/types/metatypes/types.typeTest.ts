import { TypeIsEqual, TypeExtends } from '../../../src/utils/typeTest'
import {
    NUMBER,
    STRING,
    BOOLEAN,
    BIGINT,
    INTEGER,
    DATE,
    ANY,
    UNION,
    ARRAY,
    TUPLE,
    OBJECT,
    LITERAL
} from '../../../src/metatypes'

const numberType = NUMBER()

TypeIsEqual(numberType, 1, true)
TypeExtends(123 as const, numberType, true)
TypeExtends(numberType, 123 as const, false)
TypeIsEqual<NUMBER, typeof numberType>(true)
TypeExtends(numberType, '1', false)
TypeIsEqual(NUMBER(), NUMBER(), true)
TypeIsEqual(NUMBER(), STRING(), false)
TypeIsEqual<string, typeof numberType>(false)

TypeIsEqual(NUMBER(), INTEGER(), true)

const stringType = STRING()

TypeIsEqual(stringType, '1', true)
TypeExtends('123' as const, stringType, true)
TypeExtends(stringType, '123' as const, false)
TypeIsEqual<STRING, typeof stringType>(true)
TypeExtends(stringType, 1, false)
TypeIsEqual(STRING(), STRING(), true)
TypeIsEqual(NUMBER(), STRING(), false)
TypeIsEqual<number, typeof stringType>(false)

const booleanType = BOOLEAN()

TypeIsEqual(booleanType, false, true)
TypeExtends(true as const, booleanType, true)
TypeExtends(booleanType, true as const, false)
TypeIsEqual<BOOLEAN, typeof booleanType>(true)
TypeExtends(booleanType, 1, false)
TypeIsEqual(BOOLEAN(), BOOLEAN(), true)
TypeIsEqual(BOOLEAN(), STRING(), false)
TypeIsEqual<number, typeof booleanType>(false)

const bigIntType = BIGINT()

TypeIsEqual(bigIntType, 1n, true)
TypeExtends(123n as const, bigIntType, true)
TypeExtends(bigIntType, 123n as const, false)
TypeIsEqual<BIGINT, typeof bigIntType>(true)
TypeExtends(bigIntType, 1 as number, false)
TypeIsEqual(BIGINT(), BIGINT(), true)
TypeIsEqual(BIGINT(), NUMBER(), false)
TypeIsEqual<number, typeof bigIntType>(false)

const date = new Date()

TypeIsEqual<typeof date, DATE>(true)
TypeIsEqual(1 as number, DATE(), false)
TypeIsEqual(STRING(), DATE(), false)
TypeIsEqual(DATE() as DATE, DATE(), true)

TypeIsEqual('123', ANY(), true)
TypeIsEqual(123, ANY(), true)
TypeIsEqual({} as null, ANY(), true)
TypeIsEqual({} as unknown, ANY(), true)
TypeIsEqual({} as never, ANY(), false)
TypeIsEqual(ANY() as ANY, ANY(), true)

const anOf1 = UNION([1, 'string'])
const anOf2 = UNION([NUMBER(), 'string'])
const anOf3 = UNION([3, STRING()])

TypeIsEqual<number | string, typeof anOf1>(true)
TypeIsEqual<number | string, typeof anOf2>(true)
TypeIsEqual<number | string, typeof anOf3>(true)
TypeIsEqual<string, typeof anOf1>(false)
TypeExtends<string, typeof anOf1>(true)
TypeExtends<typeof anOf1, string>(true)
TypeIsEqual<UNION<string | number>, typeof anOf1>(true)

const arT1 = ARRAY(['string', NUMBER(), true])
const arT2 = ARRAY(['string'])
const arT3 = ARRAY([STRING()])
const arT4 = ARRAY(NUMBER())

TypeIsEqual<(number | string | boolean)[], typeof arT1>(true)
TypeIsEqual<string[], typeof arT2>(true)
TypeIsEqual<string[], typeof arT3>(true)
TypeIsEqual<number[], typeof arT4>(true)
TypeIsEqual<string[], typeof arT4>(false)
TypeIsEqual<ARRAY<(number | string | boolean)[]>, typeof arT1>(true)

const arrEx1 = TUPLE([1, STRING()])
const arrEx2 = TUPLE(['string', NUMBER()])
const arrEx3 = TUPLE([NUMBER(), STRING()])

TypeIsEqual<[number, string], typeof arrEx1>(true)
TypeIsEqual<[string, number], typeof arrEx2>(true)
TypeIsEqual<[number, string], typeof arrEx3>(true)
TypeIsEqual<[string], typeof arrEx1>(false)
TypeIsEqual<[number, string], typeof arrEx2>(false)
TypeIsEqual<TUPLE<[number, string]>, typeof arrEx1>(true)
TypeIsEqual<TUPLE<[number, string]>, typeof arrEx2>(false)

TypeIsEqual({ a: 'string' }, OBJECT({ a: '1' }), true)
TypeIsEqual({ a: 'string' }, OBJECT({ a: 'string' }), true)
TypeIsEqual({ a: 'string' }, OBJECT({ a: STRING() }), true)
TypeIsEqual({ a: 1 as number }, OBJECT({ a: '1' }), false)
TypeIsEqual({ a: 'string' }, OBJECT({ b: 'string' }), false)
TypeIsEqual({ a: 'string' } as OBJECT<{ a: string }>, OBJECT({ a: 'string' }), true)

const lit = LITERAL(1 as const)

TypeIsEqual(1 as const, lit, true)
TypeExtends(lit, NUMBER(), true)
TypeExtends(NUMBER(), lit, false)
TypeIsEqual(1, lit, false)
TypeIsEqual(2 as const, lit, false)
TypeIsEqual(2 as LITERAL<1>, lit, true)
TypeIsEqual(2 as LITERAL<2>, lit, false)
TypeIsEqual('string', LITERAL(STRING()), true)

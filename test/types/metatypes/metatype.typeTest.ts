/* eslint-disable @typescript-eslint/ban-types */
import { TypeIsEqual, TypeExtends } from '../../../src/utils/typeTest'

import {
    IsMetaTypeSymbol,
    PrepareBaseType,
    MetaTypeFlag,
    type MetaType
} from '../../../src/metatypes/metatype'
import { STRING, DATE, NUMBER } from '../../../src/metatypes'

// Test MetaType

TypeExtends<{ [IsMetaTypeSymbol]: true }, MetaTypeFlag>(true)
TypeExtends<{ [IsMetaTypeSymbol]: false }, MetaTypeFlag>(false)

const _type = {
    a: [1, STRING(), DATE()] as const
}
const _typeValue = {
    a: [1, '2', new Date()] as const
}
const _implMock = { name: 'CUSTOM' }

TypeExtends(
    {
        ..._typeValue
    },
    {} as MetaType<typeof _type, typeof _implMock>,
    true
)

TypeIsEqual(
    {
        ..._typeValue
    },
    {} as MetaType<typeof _type, typeof _implMock>,
    false
)
TypeExtends<
    typeof _typeValue & {
        [IsMetaTypeSymbol]: true
    },
    MetaType<typeof _type, typeof _implMock>
>(true)

TypeExtends<
    {
        [IsMetaTypeSymbol]: true
    },
    MetaType<typeof _type, typeof _implMock>
>(false)

// Test PrepareType

TypeIsEqual<PrepareBaseType<MetaTypeFlag>, MetaTypeFlag>(true)
TypeIsEqual<PrepareBaseType<string>, string>(true)
TypeIsEqual<PrepareBaseType<''>, ''>(true)
TypeIsEqual<PrepareBaseType<number>, number>(true)
TypeIsEqual<PrepareBaseType<1>, 1>(true)
TypeIsEqual<PrepareBaseType<boolean>, boolean>(true)
TypeIsEqual<PrepareBaseType<true>, true>(true)
TypeIsEqual<PrepareBaseType<false>, false>(true)
TypeIsEqual<PrepareBaseType<Date>, Date>(true)
TypeIsEqual<PrepareBaseType<bigint>, bigint>(true)
TypeIsEqual<PrepareBaseType<1n>, 1n>(true)

class TestA {
    a: number = 1
}

TypeIsEqual({} as PrepareBaseType<TestA>, new TestA(), true)

TypeIsEqual<PrepareBaseType<[]>, []>(true)
TypeIsEqual<PrepareBaseType<any[]>, [1, '3']>(false)
TypeExtends<PrepareBaseType<any[]>, [1, '3']>(false)
TypeExtends<[1, '3'], PrepareBaseType<any[]>>(true)
TypeExtends<[number, boolean], PrepareBaseType<[number, string]>>(false)
TypeIsEqual<readonly [number, string], PrepareBaseType<readonly [number, string]>>(true)
TypeIsEqual<
    PrepareBaseType<
        readonly [
            number,
            readonly [
                STRING,
                NUMBER,
                [3],
                {
                    a: STRING
                }
            ]
        ]
    >,
    readonly [number, readonly [string, number, 3[], { a: string }]]
>(true)

TypeIsEqual<{}, PrepareBaseType<{}>>(true)
TypeIsEqual<{ a: '1' }, PrepareBaseType<Record<string, string>>>(false)
TypeExtends<{ a: '1' }, PrepareBaseType<Record<string, string>>>(true)
TypeExtends<{ a: '1' }, PrepareBaseType<{ a: '2' }>>(false)
TypeIsEqual<
    PrepareBaseType<{
        a: {
            b: {
                c: 3
                d: number
            }
        }
        b: STRING
    }>,
    {
        a: {
            b: {
                c: 3
                d: number
            }
        }
        b: string
    }
>(true)

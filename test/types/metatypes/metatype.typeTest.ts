/* eslint-disable @typescript-eslint/ban-types */
import { TypeIsEqual, TypeExtends } from '../../../src/utils/typeTest'

import {
    IsMetaTypeSymbol,
    MetaTypeSymbol,
    MetaTypeImplSymbol,
    PrepareBaseType,
    MetaTypeFlag,
    MetaTypeProps,
    type MetaType
} from '../../../src/metatypes/metatype'

// Test MetaType

TypeExtends<{ [IsMetaTypeSymbol]: true }, MetaTypeFlag>(true)
TypeExtends<{ [IsMetaTypeSymbol]: false }, MetaTypeFlag>(false)

const _type = {
    a: [1, String, Date] as const
}
const _typeValue = {
    a: [1, '2', new Date()] as const
}
const _metaTypeMock = {} as MetaType<typeof _type, typeof _implMock, typeof _typeValue>
const _implMock = { name: 'CUSTOM' }

TypeExtends<
    {
        [MetaTypeSymbol]: typeof _metaTypeMock
        [MetaTypeImplSymbol]: typeof _implMock
    },
    MetaTypeProps<typeof _type, typeof _implMock, typeof _typeValue>
>(true)

TypeExtends<
    {
        [MetaTypeSymbol]: unknown
        [MetaTypeImplSymbol]: typeof _implMock
    },
    MetaTypeProps<typeof _type, typeof _implMock, typeof _typeValue>
>(false)

TypeExtends<
    {
        [MetaTypeSymbol]: typeof _metaTypeMock
        [MetaTypeImplSymbol]: unknown
    },
    MetaTypeProps<typeof _type, typeof _implMock, typeof _typeValue>
>(false)

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
        [MetaTypeSymbol]: typeof _metaTypeMock
        [MetaTypeImplSymbol]: typeof _implMock
    },
    MetaType<typeof _type, typeof _implMock>
>(true)

TypeExtends<
    {
        [IsMetaTypeSymbol]: true
        [MetaTypeSymbol]: typeof _metaTypeMock
        [MetaTypeImplSymbol]: typeof _implMock
    },
    MetaType<typeof _type, typeof _implMock>
>(false)

// Test PrepareType

TypeIsEqual<PrepareBaseType<MetaTypeFlag>, MetaTypeFlag>(true)
TypeIsEqual<PrepareBaseType<typeof String>, string>(true)
TypeIsEqual<PrepareBaseType<StringConstructor>, string>(true)
TypeIsEqual<PrepareBaseType<string>, string>(true)
TypeIsEqual<PrepareBaseType<''>, ''>(true)
TypeIsEqual<PrepareBaseType<typeof Number>, number>(true)
TypeIsEqual<PrepareBaseType<NumberConstructor>, number>(true)
TypeIsEqual<PrepareBaseType<number>, number>(true)
TypeIsEqual<PrepareBaseType<1>, 1>(true)
TypeIsEqual<PrepareBaseType<BooleanConstructor>, boolean>(true)
TypeIsEqual<PrepareBaseType<boolean>, boolean>(true)
TypeIsEqual<PrepareBaseType<true>, true>(true)
TypeIsEqual<PrepareBaseType<false>, false>(true)
TypeIsEqual<PrepareBaseType<DateConstructor>, Date>(true)
TypeIsEqual<PrepareBaseType<Date>, Date>(true)
TypeIsEqual<PrepareBaseType<BigIntConstructor>, bigint>(true)
TypeIsEqual<PrepareBaseType<bigint>, bigint>(true)
TypeIsEqual<PrepareBaseType<1n>, 1n>(true)

class TestA {
    a: number = 1
}

TypeIsEqual({} as PrepareBaseType<typeof TestA>, new TestA(), true)
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
                typeof String,
                number,
                [3],
                {
                    a: typeof String
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
        b: typeof String
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
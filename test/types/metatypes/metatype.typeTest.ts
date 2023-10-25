/* eslint-disable @typescript-eslint/ban-types */
import { TypeIsEqual, TypeExtends } from '../../../src/utils/typeTest'

import { IsMetaTypeSymbol, MetaTypeFlag, type MetaType } from '../../../src/metatypes/metatype'
import { STRING, DATE } from '../../../src/metatypes'

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

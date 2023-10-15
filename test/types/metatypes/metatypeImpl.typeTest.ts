/* eslint-disable @typescript-eslint/ban-types */
import { TypeExtends } from '../../../src/utils/typeTest'

import { MetaTypeArgs, SchemaType } from '../../../src/metatypes/metatypeImpl'

// Test MetaTypeArgs

const _type = {
    a: 1
}

TypeExtends<
    {
        default: typeof _type
    },
    MetaTypeArgs<typeof _type>
>(true)

// Test Schema

TypeExtends<
    {
        schema: SchemaType
    },
    MetaTypeArgs<typeof _type>
>(true)

TypeExtends<
    {
        schema: {
            type: 'string'
        }
    },
    MetaTypeArgs<typeof _type>
>(true)

TypeExtends<
    {
        schema: {
            type: 1
        }
    },
    MetaTypeArgs<typeof _type>
>(false)

import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'

@MetaTypeImpl.registerMetaType
export class StringImpl extends MetaTypeImpl {
    name = 'STRING'
    schema: SchemaType = { type: 'string' }

    castToType({ value }) {
        if (value === String) {
            return null
        }

        if (typeof value === 'number') {
            return String(value)
        }

        if (typeof value === 'bigint') {
            return value.toString()
        }

        if (typeof value === 'symbol') {
            return value.description
        }

        return value
    }

    static isCompatible(value: any) {
        return typeof value === 'string' || value === String
    }

    static getCompatibilityScore(_value: any) {
        return 1
    }
}

export type STRING = MetaType<string, StringImpl>

/**
 * metatype that similar to string
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: STRING() }) // as { a: string }
 * obj1.a = 'str
 * // obj1.a = Symbol('symbol') -> type error (obj1.a = 'symbol')
 * // obj1.a = 1 -> type error (obj1.a = '1')
 * // obj1.a = true -> type & validation error
 *
 * let obj2: STRING = null
 * obj2 = 'str
 * // obj2 = 1 -> type error
 * ```
 */
export function STRING(args?: MetaTypeArgs<STRING>) {
    return MetaType<STRING>(StringImpl.build(args))
}

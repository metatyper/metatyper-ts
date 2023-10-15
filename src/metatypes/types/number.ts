import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'

@MetaTypeImpl.registerMetaType
export class NumberImpl extends MetaTypeImpl {
    name = 'NUMBER'

    schema: SchemaType = { type: 'number' }

    castToType({ value }) {
        if (value === Number) {
            return null
        }

        return value
    }

    static isCompatible(value: any) {
        return typeof value === 'number' || value === Number
    }

    static getCompatibilityScore(_value: any) {
        return 1
    }
}

export type NUMBER = MetaType<number, NumberImpl>

/**
 * metatype that similar to number
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: NUMBER() }) // as { a: number }
 * obj1.a = 1
 * obj1.a = 1.2
 * // obj1.a = 'str' -> type & validation error
 *
 * let obj2: NUMBER = null
 * obj2 = 1
 * // obj2 = 'str' -> type error
 * ```
 */
export function NUMBER(args?: MetaTypeArgs<NUMBER>) {
    return MetaType<NUMBER>(NumberImpl.build(args))
}

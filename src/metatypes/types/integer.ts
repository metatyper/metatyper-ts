import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'

export class IntegerImpl extends MetaTypeImpl {
    name = 'INTEGER'
    schema: SchemaType = { type: 'integer' }

    castToType({ value }) {
        if (typeof value === 'number' && !Number.isInteger(value)) {
            return value < 0 ? Math.ceil(value) : Math.floor(value)
        }

        return value
    }

    static isCompatible(value: any) {
        return typeof value === 'number' && Number.isInteger(value)
    }
}

export type INTEGER = MetaType<number, IntegerImpl>

/**
 * metatype that similar to number (with integer validation)
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: INTEGER() }) // as { a: number }
 * obj1.a = 1
 * // obj1.a = 1.2 -> validation error
 *
 * let obj2: INTEGER = null
 * obj2 = 1
 * obj2 = 1.5 // ok because there is not integer type
 * ```
 */
export function INTEGER(args?: MetaTypeArgs<INTEGER>) {
    return MetaType<INTEGER>(IntegerImpl.build(args))
}

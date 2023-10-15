import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'

@MetaTypeImpl.registerMetaType
export class BooleanImpl extends MetaTypeImpl {
    name = 'BOOLEAN'
    schema: SchemaType = { type: 'boolean' }

    castToType({ value }) {
        if (value === Boolean) {
            return null
        }

        if (value === 0) {
            return false
        }

        if (value === 1) {
            return true
        }

        return value
    }

    static isCompatible(value: any) {
        return typeof value === 'boolean' || value === Boolean
    }

    static getCompatibilityScore(_value: any) {
        return 1
    }
}

export type BOOLEAN = MetaType<boolean, BooleanImpl>

/**
 * metatype that similar to boolean
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: BOOLEAN() }) // as { a: boolean }
 * obj1.a = true
 * // obj1.a = 1 -> type error (you can use 1 and 0 as true and false without type checking)
 * // obj1.a = 2 -> type & validation error
 *
 * let obj2: BOOLEAN = null
 * obj2 = true
 * // obj2 = 1 -> type error (in this case there is only type checking)
 * ```
 */
export function BOOLEAN(args?: MetaTypeArgs<BOOLEAN>) {
    return MetaType<BOOLEAN>(BooleanImpl.build(args))
}

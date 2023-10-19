import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'

@MetaTypeImpl.registerMetaType
export class BigIntImpl extends MetaTypeImpl {
    name = 'BIGINT'
    schema: SchemaType = { type: 'string', pattern: '^([-+]?[0-9]+)$' }

    castToType({ value }) {
        if (
            typeof value === 'boolean' ||
            (typeof value === 'string' && /^([-+]?[0-9]+)$/.test(value))
        ) {
            return BigInt(value)
        }

        if (typeof value === 'number') {
            if (!Number.isInteger(value)) {
                return BigInt(value < 0 ? Math.ceil(value) : Math.floor(value))
            } else {
                return BigInt(value)
            }
        }

        return value
    }

    castToRawValue({ value }) {
        return value.toString()
    }

    static isCompatible(value: any) {
        return typeof value === 'bigint'
    }

    static getCompatibilityScore(_value: any) {
        return 1
    }
}

export type BIGINT = MetaType<bigint, BigIntImpl>

/**
 * metatype that similar to bigint
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: BIGINT() }) // as { a: bigint }
 * obj1.a = 1n
 * // obj1.a = 1 -> type error
 * // obj1.a = 'str' -> type & validation error
 *
 * let obj2: BIGINT = null
 * obj2 = 2n
 * // obj2 = 2 -> type error
 * // obj2 = 'str' -> type error (in this case there is only type checking)
 * ```
 */
export function BIGINT(args?: MetaTypeArgs<BIGINT>) {
    return MetaType<BIGINT>(BigIntImpl.build(args))
}

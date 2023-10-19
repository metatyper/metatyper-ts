import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'
import { isEqual } from '../../utils/objects'

export class LiteralImpl extends MetaTypeImpl {
    name = 'LITERAL'

    configure(args?: MetaTypeArgs) {
        this.schema = {
            const: this?.subType
        }

        if (args?.default === undefined) this.default = this.subType
    }

    toString() {
        return `${this.name}<${this.subType}>`
    }

    isMetaTypeOf(type: any) {
        return isEqual(this.subType, type)
    }

    static isCompatible() {
        return true
    }
}

export type LITERAL<T> = MetaType<T, LiteralImpl, T>

/**
 * metatype literal value
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: LITERAL('1') }) // as { a: '1' }
 * obj1.a = '1'
 * // obj1.a = '2' -> type & validation error
 *
 * let obj2: LITERAL<'1'> = null
 * obj2 = '1'
 * // obj2 = '2 -> type error
 *
 * const obj3 = Meta({ a: LITERAL({ b: 1 }) }) // as { a: { b: 1 } }
 * obj3.a = { b: 1 }
 * // obj3.a = { b: 2 } -> type & validation error
 *
 * ```
 */
export function LITERAL<T extends number | string | symbol | boolean | bigint>(
    subType: T,
    args?: MetaTypeArgs<LITERAL<T>>
) {
    if (MetaType.isMetaType(subType)) {
        return subType
    }

    if (
        typeof subType !== 'number' &&
        typeof subType !== 'string' &&
        typeof subType !== 'symbol' &&
        typeof subType !== 'boolean' &&
        typeof subType !== 'bigint'
    )
        return subType

    return MetaType<LITERAL<T>>(
        LiteralImpl.build({
            ...args,
            subType
        })
    )
}

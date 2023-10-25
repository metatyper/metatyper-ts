import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'

import { isEqual } from '../../utils'

export class LiteralImpl extends MetaTypeImpl {
    name = 'LITERAL'

    getJsonSchema() {
        if (this.schema) {
            return this.schema
        }

        return (this.schema = {
            const: this.subType
        })
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

export type LITERAL<T> = MetaType<T, LiteralImpl>

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
): LITERAL<T> {
    if (MetaType.isMetaType(subType)) {
        return subType
    }

    return MetaType<LITERAL<T>>(
        LiteralImpl.build({
            ...args,
            subType
        })
    )
}

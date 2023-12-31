import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'

@MetaTypeImpl.registerMetaType
export class DateImpl extends MetaTypeImpl {
    name = 'DATE'
    schema: SchemaType = { type: 'number' }

    castToType({ value }) {
        if (typeof value === 'number') {
            return new Date(value)
        }

        return value
    }

    castToRawValue({ value }) {
        return value.getTime()
    }

    static isCompatible(value: any) {
        return value instanceof Date || (Number.isFinite(value) && value >= 0)
    }

    static getCompatibilityScore(value: any): number {
        // 0 for numbers
        return value instanceof Date ? 3 : 0
    }
}

export type DATE = MetaType<Date, DateImpl>

/**
 * metatype that similar to Date
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: DATE() }) // as { a: Date }
 * obj1.a = new Date()
 * // obj1.a = 1 -> type error (you can use integer timestamp without type checking)
 * // obj1.a = 'str -> type & validation error
 *
 * let obj2: DATE = null
 * obj2 = new Date()
 * // obj2 = 1 -> type error (in this case there is only type checking)
 * ```
 */
export function DATE(args?: MetaTypeArgs<DATE>) {
    return MetaType<DATE>(DateImpl.build(args))
}

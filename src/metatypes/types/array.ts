import { MetaType, MetaTypeFlag, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'
import { NotEmptyArray } from '../../validators/notEmptyArray.validator'

import { ANY } from './any'
import { ANY_OF } from './anyOf'

type ArrayMetaTypeArgs = {
    notEmpty?: boolean
}

@MetaTypeImpl.registerMetaType
export class ArrayImpl extends MetaTypeImpl {
    name = 'ARRAY'

    private _subType: MetaTypeImpl = null

    configure(args?: MetaTypeArgs & ArrayMetaTypeArgs) {
        const notEmpty = args?.notEmpty
        const subType = MetaTypeImpl.getMetaTypeImpl(args?.subType || ANY())
        const validators = notEmpty
            ? [...(args?.validators || []), NotEmptyArray]
            : [...(args?.validators || [])]

        this._subType = subType
        this.validators = validators
        this.schema = {
            type: 'array',
            items: subType.schema,
            minItems: notEmpty ? 1 : 0
        }
    }

    isMetaTypeOf(value: any) {
        return (
            Array.isArray(value) &&
            value.every((valueItem) => this._subType.isMetaTypeOf(valueItem))
        )
    }

    castToType({ value }) {
        if ((value as any) === Array) {
            return null
        }

        return value?.map((item: any) => this._subType.castToType(item))
    }

    castToRawValue({ value }) {
        return value?.map((item: any) => this._subType.castToRawValue(item))
    }

    static isCompatible(value: any): boolean {
        return Array.isArray(value) || value === Array
    }

    static getCompatibilityScore(_value: any) {
        return 1
    }
}

export type ARRAY<T> = MetaType<T[], ArrayImpl>

/**
 * metatype that works like an array
 *
 * @param subType - items type or union of items types (default: {@link ANY})
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: ARRAY([1, String, BOOLEAN()]) }) // as { a : (number | string | boolean)[] }
 * obj1.a = [1]
 * obj1.a = [1, 'str']
 * obj1.a = [true, 1]
 * // obj1.a = {} -> type & validation error
 *
 * let obj2: ARRAY<number | string | boolean> = null
 * obj2 = [false, 1, 'str']
 * // obj2 = {} -> type error
 *
 * const obj3 = Meta({ a: ARRAY(Number) }) // as { a : number[] }
 * obj3.a = [1]
 * // obj3.a = ['str'] -> type & validation error
 * // TODO: obj3.push('str') -> validation error or not
 * ```
 */
export function ARRAY<T extends MetaTypeFlag = any, R = PrepareBaseType<T>>(
    subType?: T,
    args?: MetaTypeArgs<ARRAY<R>> & ArrayMetaTypeArgs
): ARRAY<R>
export function ARRAY<T = any, R = PrepareBaseType<T>>(
    subType?: T[],
    args?: MetaTypeArgs<ARRAY<R>> & ArrayMetaTypeArgs
): ARRAY<R>
export function ARRAY<T = any, R = PrepareBaseType<T>>(
    subType?: T,
    args?: MetaTypeArgs<ARRAY<R>> & ArrayMetaTypeArgs
): ARRAY<R>
export function ARRAY(subType?: any, args?: MetaTypeArgs & ArrayMetaTypeArgs) {
    if (Array.isArray(subType)) {
        if (subType.length === 1) {
            subType = subType[0]
        } else if (subType.length > 1) {
            subType = ANY_OF(subType)
        } else {
            subType = ANY()
        }
    }

    if (!subType) subType = ANY()

    return MetaType(
        ArrayImpl.build({
            ...args,
            subType
        })
    )
}

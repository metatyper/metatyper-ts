import { MetaType, MetaTypeFlag, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'
import { metaTypesSchemaToValue } from '../../utils/meta'
import { NotEmptyArray } from '../../validators/notEmptyArray.validator'

import { AnyImpl } from './any'
import { AnyOfImpl } from './anyOf'

type ArrayMetaTypeArgs = {
    notEmpty?: boolean
}

@MetaTypeImpl.registerMetaType
export class ArrayImpl extends MetaTypeImpl {
    name = 'ARRAY'

    configure(args?: MetaTypeArgs & ArrayMetaTypeArgs) {
        const notEmpty = args?.notEmpty
        let subType: any = this.subType || this.default

        if (Array.isArray(subType)) {
            if (subType.length === 1) {
                subType = MetaTypeImpl.getMetaTypeImpl(subType[0], args?.subTypesDefaultArgs)
            } else if (subType.length > 1) {
                if (args?.subTypesDefaultArgs instanceof Function) {
                    subType = AnyOfImpl.build((metaTypeImpl) => {
                        const argsFunc = args?.subTypesDefaultArgs as (impl: MetaTypeImpl) => any
                        const subArgs = argsFunc(metaTypeImpl) || {}

                        return {
                            ...subArgs,
                            subType
                        }
                    })
                } else {
                    subType = AnyOfImpl.build({
                        ...(args?.subTypesDefaultArgs || {}),
                        subType
                    })
                }
            } else {
                subType = AnyImpl.build(args?.subTypesDefaultArgs)
            }
        } else {
            subType = MetaTypeImpl.getMetaTypeImpl(subType, args?.subTypesDefaultArgs)
        }

        this.subType = subType || AnyImpl.build(args?.subTypesDefaultArgs)

        this.default = metaTypesSchemaToValue(this.default)

        const validators = notEmpty
            ? [...(this.validators || []), NotEmptyArray]
            : [...(this.validators || [])]

        this.validators = validators

        this.schema = {
            type: 'array',
            items: this.subType.schema,
            minItems: notEmpty ? 1 : 0
        }
    }

    toString() {
        return `${this.name}<${this.subType}>`
    }

    isMetaTypeOf(value: any) {
        return (
            Array.isArray(value) &&
            value.every((valueItem) => this.subType.isMetaTypeOf(valueItem))
        )
    }

    castToType({ value, ...args }) {
        if ((value as any) === Array) {
            return null
        }

        return value?.map((item: any) =>
            this.subType.castToType({ ...args, value: item, metaTypeImpl: this.subType })
        )
    }

    castToRawValue({ value, ...args }) {
        return value?.map((item: any) =>
            this.subType.castToRawValue({ ...args, value: item, metaTypeImpl: this.subType })
        )
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
    return MetaType(
        ArrayImpl.build({
            ...args,
            subType
        })
    )
}

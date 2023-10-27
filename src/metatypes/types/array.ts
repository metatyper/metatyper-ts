import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'

import { NotEmptyArray } from '../../validators'
import { objectDeepMap, prepareDeepSubTypes } from '../../utils'
import { TypeBuildError } from '../../errors'

import { AnyImpl } from './any'
import { UnionImpl } from './union'
import { MetaRefSymbol } from './ref'

type ArrayMetaTypeArgs = {
    notEmpty?: boolean
}

@MetaTypeImpl.registerMetaType
export class ArrayImpl extends MetaTypeImpl {
    name = 'ARRAY'

    prepareSubType(subType: any, args: MetaTypeArgs) {
        if (!Array.isArray(subType)) {
            throw new TypeBuildError('subType must be an array', ArrayImpl)
        }

        subType = prepareDeepSubTypes(subType, args)

        const ref = subType[MetaRefSymbol]

        if (subType.length === 0) {
            subType = AnyImpl.build(args?.subTypesDefaultArgs)
        } else if (subType.length === 1) {
            subType = MetaTypeImpl.getMetaTypeImpl(subType[0], args?.subTypesDefaultArgs)
        } else if (subType.length > 1) {
            subType = UnionImpl.build({
                ...(args?.subTypesDefaultArgs || {}),
                subType
            })
        }

        if (ref) {
            if (!ref['source']) {
                ref['source'] = this
            }

            subType[MetaRefSymbol] = ref
        }

        return subType
    }

    configure(args?: MetaTypeArgs & ArrayMetaTypeArgs) {
        if (args.notEmpty) {
            this.defaultValidators = [...(this.defaultValidators || []), NotEmptyArray]
        }
    }

    getJsonSchema() {
        if (this.schema) {
            return this.schema
        }

        const subTypeSchema = this.subType.getJsonSchema()

        if (!subTypeSchema) {
            this.schema = null

            return null
        }

        this.schema = {
            type: 'array',
            items: subTypeSchema,
            minItems: this.args.notEmpty ? 1 : 0
        }

        if (this.subType[MetaRefSymbol]) {
            this.schema['id'] = this.subType[MetaRefSymbol].index
        }

        return this.schema
    }

    toString() {
        const ref = this.subType[MetaRefSymbol]?.index
        const refString = ref ? `(id: ${ref})` : ''

        return `${this.name}${refString}<${this.subType}[]>`
    }

    isMetaTypeOf(value: any) {
        if (!Array.isArray(value)) {
            return false
        }

        if (this.subType instanceof AnyImpl) {
            return true
        }

        for (const item of value) {
            if (!item) continue

            // TODO: resolve it
            if (objectDeepMap.circularRef(item)) {
                continue
            }

            if (!this.subType.isMetaTypeOf(item)) {
                return false
            }
        }

        return true
    }

    castToType({ value, ...args }) {
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
        return Array.isArray(value)
    }

    static getCompatibilityScore(_value: any) {
        return 3
    }
}

export type ARRAY<T> = MetaType<T, ArrayImpl>

/**
 * metatype that works like an array
 *
 * @param subType - items type or union of items types (default: {@link ANY})
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: ARRAY([1, 'string', BOOLEAN()]) }) // as { a : (number | string | boolean)[] }
 * obj1.a = [1]
 * obj1.a = [1, 'str']
 * obj1.a = [true, 1]
 * // obj1.a = {} -> type & validation error
 *
 * let obj2: ARRAY<number | string | boolean> = null
 * obj2 = [false, 1, 'str']
 * // obj2 = {} -> type error
 *
 * const obj3 = Meta({ a: ARRAY(NUMBER()) }) // as { a : number[] }
 * obj3.a = [1]
 * // obj3.a = ['str'] -> type & validation error
 * // TODO: obj3.push('str') -> validation error or not
 * ```
 */
export function ARRAY<T = any>(
    subType?: T[],
    args?: MetaTypeArgs<ARRAY<T>> & ArrayMetaTypeArgs
): ARRAY<T[]>
export function ARRAY<T = any>(
    subType?: () => T[],
    args?: MetaTypeArgs<ARRAY<T>> & ArrayMetaTypeArgs
): ARRAY<T[]>
export function ARRAY<T = any>(
    subType?: T,
    args?: MetaTypeArgs<ARRAY<T>> & ArrayMetaTypeArgs
): ARRAY<T[]>
export function ARRAY(subType?: any, args?: any) {
    if (subType instanceof Function) subType = subType()

    if (!Array.isArray(subType)) {
        subType = [subType]
    }

    return MetaType(
        ArrayImpl.build({
            ...args,
            subType
        })
    )
}

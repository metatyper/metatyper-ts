import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'

import { prepareDeepSubTypes } from '../../utils'
import { TypeBuildError } from '../../errors'

import { MetaRefSymbol } from './ref'

export class TupleImpl extends MetaTypeImpl {
    name = 'TUPLE'
    subType: MetaTypeImpl[]

    prepareSubType(subType: any, args: MetaTypeArgs) {
        if (!Array.isArray(subType)) {
            throw new TypeBuildError(`subType must be an array`, TupleImpl)
        }

        subType = prepareDeepSubTypes(subType, args)

        const ref = subType[MetaRefSymbol]

        if (ref) {
            if (!ref['source']) {
                ref['source'] = this
            }

            subType[MetaRefSymbol] = ref
        }

        return subType
    }

    getJsonSchema(): SchemaType {
        if (this.schema) {
            return this.schema
        }

        const schemaList = this.subType
            .map((metaType) => metaType.getJsonSchema())
            .filter((schema) => schema)

        if (schemaList.length === 0) {
            this.schema = null

            return null
        }

        this.schema = {
            type: 'array',
            items: schemaList,
            minItems: this.subType.length,
            maxItems: this.subType.length
        }

        if (this.subType[MetaRefSymbol]) {
            this.schema['id'] = this.subType[MetaRefSymbol].index
        }

        return this.schema
    }

    toString() {
        const ref = this.subType[MetaRefSymbol]?.index
        const refString = ref ? `(id: ${ref})` : ''

        return `${this.name}${refString}<[ ${this.subType.join(', ')} ]>`
    }

    isMetaTypeOf(value: any) {
        return (
            Array.isArray(value) &&
            value.length === this.subType.length &&
            this.subType.every((metaTypeImpl, i) => metaTypeImpl.isMetaTypeOf(value[i]))
        )
    }

    castToType({ value, ...args }) {
        return (value as any[]).map((item, i) =>
            this.subType[i].castToType({
                ...args,
                value: item,
                metaTypeImpl: this.subType[i]
            })
        )
    }

    castToRawValue({ value, ...args }) {
        return (value as any[])?.map((item, i) =>
            this.subType[i].castToRawValue({
                ...args,
                value: item,
                metaTypeImpl: this.subType[i]
            })
        )
    }

    static isCompatible(value: any): boolean {
        return Array.isArray(value)
    }
}

export type TUPLE<T extends any[]> = MetaType<T, TupleImpl>

/**
 * metatype that works like an array with precise structure
 *
 * @param subType - array of types
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: TUPLE([1, 'string', BOOLEAN()]) }) // as { a : [number, string, boolean] }
 * obj1.a = [1, 'str', true]
 * // obj1.a = [1, true, 'str'] -> type & validation error
 * // obj1.a = [1] -> type & validation error
 * // obj1.a = {} -> type & validation error
 *
 * let obj2: TUPLE<[number, string, boolean]> = null
 * obj2 = [1, 'str', true]
 * // obj2 = [1, true, 'str'] -> type & validation error
 * // obj2 = {} -> type & validation error
 * ```
 */
export function TUPLE<T extends any[]>(
    types: [...T] | (() => [...T]),
    args?: MetaTypeArgs<TUPLE<T>>
) {
    if (types instanceof Function) {
        types = types()
    }

    return MetaType<TUPLE<T>>(TupleImpl.build({ ...args, subType: types }))
}

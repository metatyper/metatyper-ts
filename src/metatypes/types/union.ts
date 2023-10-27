import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'

import { prepareDeepSubTypes } from '../../utils'
import { TypeBuildError } from '../../errors'
import { MetaRefSymbol } from './ref'

export class UnionImpl extends MetaTypeImpl {
    name = 'UNION'
    subType: MetaTypeImpl[]

    prepareSubType(subType: any, args: MetaTypeArgs) {
        if (!Array.isArray(subType)) {
            throw new TypeBuildError(`subType must be an array`, UnionImpl)
        }

        subType = prepareDeepSubTypes(subType, args)

        const ref = subType[MetaRefSymbol]

        if (ref && !ref['source']) {
            ref['source'] = this
        }

        return subType
    }

    getJsonSchema() {
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
            anyOf: schemaList
        }

        if (this.subType[MetaRefSymbol]) {
            this.schema['id'] = this.subType[MetaRefSymbol].index
        }

        return this.schema
    }

    toString() {
        const ref = this.subType[MetaRefSymbol]?.index
        const refString = ref ? `(id: ${ref})` : ''

        return `${this.name}${refString}<${this.subType.join(' | ')}>`
    }

    protected getMetaTypeOf(value: any) {
        return this.subType.find((metaType) => metaType.isMetaTypeOf(value))
    }

    isMetaTypeOf(value: any) {
        return this.getMetaTypeOf(value) !== undefined
    }

    castToType({ value, ...args }) {
        const metaTypeImpl = this.getMetaTypeOf(value)

        return metaTypeImpl?.castToType({ ...args, value, metaTypeImpl }) ?? value
    }

    castToRawValue({ value, ...args }) {
        const metaTypeImpl = this.getMetaTypeOf(value)

        return metaTypeImpl?.castToRawValue({ ...args, value, metaTypeImpl }) ?? value
    }

    static isCompatible(_value: any) {
        return true
    }
}

export type UNION<T> = MetaType<T, UnionImpl>

/**
 * metatype that works like a union of specified types
 *
 * @param subType - array of types
 * @param args - {@link MetaTypeArgs}
 *
 * @typeParam T - union of specified types
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: UNION([1, 'string', BOOLEAN()]) }) // as { a : number | string | boolean }
 * obj1.a = 1
 * obj1.a = 'str'
 * obj1.a = true
 * // obj1.a = {} -> type & validation error
 *
 * let obj2: UNION<number | string | boolean> = 2
 * obj2 = 'str'
 * obj2 = true
 * // obj2 = {} -> type & validation error
 * ```
 */
export function UNION<T>(subType: T[] | (() => T[]), args?: MetaTypeArgs<UNION<T>>) {
    if (subType instanceof Function) {
        subType = subType()
    }

    return MetaType<UNION<T>>(
        UnionImpl.build({
            ...args,
            subType
        })
    )
}

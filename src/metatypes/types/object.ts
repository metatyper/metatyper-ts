import { MetaType, MetaTypeFlag } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'

import { objectDeepMap, prepareDeepSubTypes } from '../../utils'
import { TypeBuildError } from '../../errors'

import { AnyImpl } from './any'
import { MetaRefSymbol } from './ref'

export type ObjectMetaTypeArgs = {
    makeDeepCopy: boolean
}

@MetaTypeImpl.registerMetaType
export class ObjectImpl extends MetaTypeImpl {
    name = 'OBJECT'

    prepareSubType(subType: any, args: MetaTypeArgs) {
        if (!subType) {
            throw new TypeBuildError('subType must be a plain object or MetaType', ObjectImpl)
        }

        if (!subType) {
            subType = AnyImpl.build(args?.subTypesDefaultArgs)
        } else {
            subType = prepareDeepSubTypes(subType, args)

            const ref = subType[MetaRefSymbol]

            if (ref && !ref['source']) {
                ref['source'] = this
            }
        }

        return subType
    }

    getJsonSchema() {
        if (this.schema) {
            return this.schema
        }

        if (this.subType instanceof MetaTypeImpl) {
            this.schema = {
                type: 'object',
                additionalProperties: this.subType.getJsonSchema()
            }
        } else {
            this.schema = {
                type: 'object',
                properties: Object.fromEntries(
                    Object.entries<any>(this.subType).map(([key, impl]) => {
                        return [key, impl && impl.getJsonSchema ? impl.getJsonSchema() : {}]
                    })
                )
                // TODO: add required: Object.keys(subType)
            }
        }

        if (this.subType[MetaRefSymbol]) {
            this.schema['id'] = this.subType[MetaRefSymbol].index
        }

        return this.schema
    }

    toString() {
        const ref = this.subType[MetaRefSymbol]?.index
        const refString = ref ? `(id: ${ref})` : ''

        const subTypeRepr = Object.entries(this.subType)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')

        if (this.subType instanceof MetaTypeImpl) {
            return `${this.name}${refString}<${this.subType}>`
        }

        return `${this.name}${refString}<{ ${subTypeRepr} }>`
    }

    isMetaTypeOf(value: any) {
        if (!(value instanceof Object) || Array.isArray(value)) {
            return false
        }

        if (this.subType instanceof AnyImpl) {
            return value instanceof Object
        }

        // TODO: process required fields

        if (this.subType instanceof MetaTypeImpl) {
            for (const key of Object.keys(value)) {
                if (objectDeepMap.circularRef(value[key])) {
                    continue
                }

                if (!this.subType.isMetaTypeOf(value[key])) {
                    return false
                }
            }
        } else {
            for (const key of Object.keys(value)) {
                if (objectDeepMap.circularRef(value[key])) {
                    continue
                }

                let metaType = this.subType[key]

                if (!metaType) continue

                if (objectDeepMap.circularRef(metaType)) {
                    metaType = metaType.source
                }

                if (!metaType.isMetaTypeOf(value[key])) {
                    return false
                }
            }
        }

        return true
    }

    castToType({ value }) {
        return objectDeepMap(
            value,
            (obj) => {
                if (MetaType.isMetaType(obj)) {
                    obj = (obj as any).metaTypeImpl.default
                }

                if (obj instanceof MetaTypeImpl) {
                    obj = obj.default
                }

                const circularRef = objectDeepMap.circularRef(obj)

                if (circularRef) {
                    return circularRef.source
                }

                return obj
            },
            {
                deepCopy: this.args.makeDeepCopy
            }
        )
    }

    static isCompatible(value: any) {
        return typeof value === 'object' && !Array.isArray(value) && value !== null
    }

    static getCompatibilityScore(_value: any) {
        return 0
    }
}

export type OBJECT<T> = MetaType<T, ObjectImpl>

/**
 * metatype that works like an object
 *
 * @param subType - object structure with types or meta type (Record<string, metaType>)
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: OBJECT({ a1: 1, a2: 'string', a3: [BOOLEAN()] }) }) // as { a : { a1: number, a2: string, a3: boolean[] } }
 * obj1.a = { a1: 1, a2: 'str', a3: [true, false] }
 * // obj1.a = { a1: 1, a2: 'str', a3: [true, false, 1] } -> type & validation error
 *
 * let obj2: OBJECT<{b: boolean}> = null
 * obj2 = { b: true }
 * // obj2 = { b: 3 } -> type error
 *
 * let obj3 = Meta({ c: OBJECT(BOOLEAN()) }) // as { c : Record<string, boolean> }
 * obj3 = { c: { _someKey: true } }
 * // obj3 = { c: { _someKey: 10 } } -> type error
 *
 * ```
 */
export function OBJECT<T extends any[]>(
    subType?: [...T] | (() => [...T]),
    args?: MetaTypeArgs<OBJECT<T>>
): OBJECT<T>
export function OBJECT<T extends object>(
    subType?: T | (() => T),
    args?: MetaTypeArgs<OBJECT<T>>
): OBJECT<T>
export function OBJECT<T, R = Record<string, T>>(
    subType?: T | (() => T),
    args?: MetaTypeArgs<OBJECT<R>>
): OBJECT<R>
export function OBJECT(subType?: any, args?: MetaTypeArgs<any>) {
    if (!subType) subType = {}

    if (subType instanceof Function) subType = subType()

    return MetaType(
        ObjectImpl.build({
            ...args,
            subType
        })
    )
}

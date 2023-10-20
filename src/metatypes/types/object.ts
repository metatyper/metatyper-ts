import { MetaType, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'
import { TypeBuildError } from '../../errors/typeBuild.error'
import { objectDeepMap, isNotPlainObject, inspectMetaValue } from '../../utils'
import { AnyImpl } from './any'

@MetaTypeImpl.registerMetaType
export class ObjectImpl extends MetaTypeImpl {
    name = 'OBJECT'

    prepareSubType(subType: any, args: MetaTypeArgs) {
        if (subType && MetaType.isMetaType(subType)) {
            throw new TypeBuildError('subType should be Record<any, any> or ANY()', ObjectImpl)
        }

        if (subType && (!(subType instanceof Object) || Array.isArray(subType))) {
            throw new TypeBuildError('subType is not object', ObjectImpl)
        }

        if (!subType) {
            subType = AnyImpl.build(args?.subTypesDefaultArgs)
        } else {
            subType = objectDeepMap(subType, (value) => {
                if (isNotPlainObject(value) || Array.isArray(value)) {
                    const impl = MetaTypeImpl.getMetaTypeImpl(value, args?.subTypesDefaultArgs)

                    if (!impl) {
                        throw new TypeBuildError(
                            `subType contains a value for which the meta type cannot be found: ${value}`,
                            ObjectImpl
                        )
                    }

                    return impl
                }

                const circularRef = objectDeepMap.circularRef(value)

                if (circularRef) {
                    return AnyImpl.build(args?.subTypesDefaultArgs) // TODO: add circular type
                }

                return value
            })
        }

        return subType
    }

    configure() {
        this.schema =
            this.subType instanceof MetaTypeImpl
                ? {
                      type: 'object'
                  }
                : {
                      type: 'object',
                      properties: Object.fromEntries(
                          Object.entries<any>(this.subType).map(([key, impl]) => [
                              key,
                              impl.schema
                          ])
                      )
                      // TODO: add required: Object.keys(subType)
                  }
    }

    toString() {
        if (this.subType instanceof AnyImpl) {
            return `${this.name}<ANY>`
        }

        return `${this.name}<${inspectMetaValue(this.subType)}>`
    }

    isMetaTypeOf(valueToCheck: any) {
        if (this.subType instanceof MetaTypeImpl) {
            return valueToCheck instanceof Object
        }

        return (
            valueToCheck instanceof Object &&
            Object.entries(this.subType).every(
                ([key, impl]: any) =>
                    valueToCheck[key] !== undefined && impl.isMetaTypeOf(valueToCheck[key])
            )
        )
    }

    castToType({ value }) {
        return objectDeepMap(value, (obj) => {
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
        })
    }

    static isCompatible(value: any) {
        return typeof value === 'object' && !Array.isArray(value) && value !== null
    }

    static getCompatibilityScore(_value: any) {
        return 0
    }
}

export type OBJECT<T extends object> = MetaType<T, ObjectImpl>

/**
 * metatype that works like an object
 *
 * @param subType - object structure with types
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
 * ```
 */
export function OBJECT<T extends object, R extends object = PrepareBaseType<T>>(
    subType?: T,
    args?: MetaTypeArgs<OBJECT<R>>
) {
    if (!subType) subType = {} as T

    return MetaType<OBJECT<R>>(
        ObjectImpl.build({
            ...args,
            subType
        })
    )
}

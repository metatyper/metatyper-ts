import { MetaType, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'
import { TypeBuildError } from '../../errors/typeBuild.error'
import { metaTypesSchemaToValue } from '../../utils/deepObjects'
import { AnyImpl } from './any'

@MetaTypeImpl.registerMetaType
export class ObjectImpl extends MetaTypeImpl {
    name = 'OBJECT'

    configure(args?: MetaTypeArgs) {
        let subType = this.subType || this.default

        if (subType && MetaType.isMetaType(subType)) {
            throw new TypeBuildError('subType should be Record<any, any> or ANY()', ObjectImpl)
        }

        if (subType && !(subType instanceof Object)) {
            throw new TypeBuildError('subType is not object', ObjectImpl)
        }

        if (!subType) {
            subType = AnyImpl.build(args?.subTypesDefaultArgs)
        } else {
            subType = Object.fromEntries(
                Object.entries(subType).map(([key, value]) => {
                    const impl = MetaTypeImpl.getMetaTypeImpl(value, args?.subTypesDefaultArgs)

                    if (!impl) {
                        throw new TypeBuildError(
                            `subType contains a value for which the meta type cannot be found: ${value}`,
                            ObjectImpl
                        )
                    }

                    return [key, impl]
                })
            )

            this.default = metaTypesSchemaToValue(this.default)
        }

        const schema: SchemaType =
            subType instanceof MetaTypeImpl
                ? {
                      type: 'object'
                  }
                : {
                      type: 'object',
                      properties: Object.fromEntries(
                          Object.entries<any>(subType).map(([key, impl]) => [key, impl.schema])
                      )
                      // TODO: add required: Object.keys(subType)
                  }

        this.schema = schema
        this.subType = subType
    }

    toString() {
        const objOwnPropsStrings = Object.entries(this.subType)
            .sort(([key1], [key2]) => key1.localeCompare(key2))
            .map(([name, value]) => `${name}: ${value}`)

        return `${this.name}<{${objOwnPropsStrings.join(', ')}}>`
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

import { MetaType, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs, SchemaType } from '../metatypeImpl'
import { TypeBuildError } from '../../errors/typeBuild.error'
import { ANY } from './any'

@MetaTypeImpl.registerMetaType
export class ObjectImpl extends MetaTypeImpl {
    name = 'OBJECT'

    configure(args?: MetaTypeArgs) {
        let subType = args?.subType

        if (!subType) {
            subType = ANY()
        }

        if (!(subType instanceof Object)) {
            throw new TypeBuildError('subType is not object', ObjectImpl)
        }

        if (subType !== ANY() && MetaType.isMetaType(subType)) {
            throw new TypeBuildError('subType should be Record<any, any> or ANY()', ObjectImpl)
        }

        const schema: SchemaType =
            subType === ANY()
                ? {
                      type: 'object'
                  }
                : {
                      type: 'object',
                      properties: Object.fromEntries(
                          Object.entries<any>(subType).map(([typeKey, typeValue]) => [
                              typeKey,
                              MetaTypeImpl.getMetaTypeImpl(typeValue)?.schema
                          ])
                      )
                      // TODO: add required: Object.keys(subType)
                  }

        this.schema = schema
        this.subType = subType
    }

    isMetaTypeOf(type: any) {
        if (this.subType === ANY()) {
            return type instanceof Object
        }

        return (
            type instanceof Object &&
            Object.entries(this.subType).every(
                ([typeKey, typeValue]: any) =>
                    type[typeKey] !== undefined &&
                    MetaTypeImpl.getMetaTypeImpl(typeValue)?.isMetaTypeOf(type[typeKey])
            )
        )
    }

    castToType({ value }) {
        if (value === Object) {
            return null
        }

        return value
    }

    static isCompatible(value: any) {
        return (
            (typeof value === 'object' && !Array.isArray(value) && value !== null) ||
            value === Object
        )
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
 * const obj1 = Meta({ a: OBJECT({ a1: 1, a2: String, a3: [BOOLEAN()] }) }) // as { a : { a1: number, a2: string, a3: boolean[] } }
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
    subType: T,
    args?: MetaTypeArgs<OBJECT<R>>
) {
    return MetaType<OBJECT<R>>(
        ObjectImpl.build({
            ...args,
            subType
        })
    )
}

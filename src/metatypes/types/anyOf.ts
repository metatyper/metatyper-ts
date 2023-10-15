import { MetaType, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'
import { TypeBuildError } from '../../errors/typeBuild.error'

export class AnyOfImpl extends MetaTypeImpl {
    name = 'ANY_OF'

    private _typesImpl: MetaTypeImpl[] = []

    configure(args?: MetaTypeArgs) {
        const typesImpl: MetaTypeImpl[] = args.subType.map((type: any) => {
            const metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(type)

            if (!metaTypeImpl) {
                throw new TypeBuildError(`Cannot get meta type for this value: ${type}`, AnyOfImpl)
            }

            return metaTypeImpl
        })

        this._typesImpl = typesImpl

        this.schema = {
            anyOf: typesImpl.map((typeOfAny) => typeOfAny.schema).filter((schema) => !!schema)
        }
    }

    getMetaTypeOf(value: any) {
        return this._typesImpl.find((metaType) => metaType.isMetaTypeOf(value))
    }

    isMetaTypeOf(value: any) {
        return this.getMetaTypeOf(value) !== undefined
    }

    castToType({ value }) {
        return this.getMetaTypeOf(value)?.castToType(value) ?? value
    }

    castToRawValue({ value }) {
        this.getMetaTypeOf(value)?.castToRawValue(value) ?? value
    }

    static isCompatible(_value: any) {
        return true
    }
}

export type ANY_OF<T> = MetaType<T, AnyOfImpl>

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
 * const obj1 = Meta({ a: ANY_OF([1, String, BOOLEAN()]) }) // as { a : number | string | boolean }
 * obj1.a = 1
 * obj1.a = 'str'
 * obj1.a = true
 * // obj1.a = {} -> type & validation error
 *
 * let obj2: ANY_OF<number | string | boolean> = 2
 * obj2 = 'str'
 * obj2 = true
 * // obj2 = {} -> type & validation error
 * ```
 */
export function ANY_OF<T, R = PrepareBaseType<T>>(subType: T[], args?: MetaTypeArgs<ANY_OF<R>>) {
    return MetaType<ANY_OF<R>>(
        AnyOfImpl.build({
            ...args,
            subType
        })
    )
}

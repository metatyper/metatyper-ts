import { MetaType, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'
import { TypeBuildError } from '../../errors/typeBuild.error'

export class ExactArrayImpl extends MetaTypeImpl {
    name = 'EXACT_ARRAY'
    private _typesImpl: MetaTypeImpl[] = null

    configure(args?: MetaTypeArgs) {
        const subType = args?.subType as any[]

        if (!Array.isArray(subType)) {
            throw new TypeBuildError('subType is not array', ExactArrayImpl)
        }

        const typesImpl: MetaTypeImpl[] = subType.map((type) => {
            const metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(type)

            if (!metaTypeImpl) {
                throw new TypeBuildError(
                    `Cannot get meta type for this value: ${type}`,
                    ExactArrayImpl
                )
            }

            return metaTypeImpl
        })

        this._typesImpl = typesImpl

        this.schema = {
            type: 'array',
            items: typesImpl.map((metaType) => metaType.schema),
            minItems: subType.length,
            maxItems: subType.length
        }
    }

    isMetaTypeOf(value: any) {
        return (
            Array.isArray(value) &&
            value.length === this._typesImpl.length &&
            this._typesImpl.every((metaTypeImpl, i) => metaTypeImpl.isMetaTypeOf(value[i]))
        )
    }

    castToType({ value }) {
        return (value as any[]).map((item, i) => this._typesImpl[i].castToType(item))
    }

    castToRawValue({ value }) {
        return (value as any[])?.map((item, i) => this._typesImpl[i].castToRawValue(item))
    }

    static isCompatible(value: any): boolean {
        return Array.isArray(value)
    }
}

type PrepareExactArrayType<
    OrigArrayT extends ReadonlyArray<any>,
    Acc extends ReadonlyArray<any> = [],
    N = OrigArrayT['length']
> = Acc['length'] extends N
    ? Acc
    : PrepareExactArrayType<OrigArrayT, [...Acc, PrepareBaseType<OrigArrayT[Acc['length']]>]>

export type EXACT_ARRAY<T extends any[]> = MetaType<T, ExactArrayImpl, T>

/**
 * metatype that works like an array with precise structure
 *
 * @param subType - array of types
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: EXACT_ARRAY([1, String, BOOLEAN()]) }) // as { a : [number, string, boolean] }
 * obj1.a = [1, 'str', true]
 * // obj1.a = [1, true, 'str'] -> type & validation error
 * // obj1.a = [1] -> type & validation error
 * // obj1.a = {} -> type & validation error
 *
 * let obj2: EXACT_ARRAY<[number, string, boolean]> = null
 * obj2 = [1, 'str', true]
 * // obj2 = [1, true, 'str'] -> type & validation error
 * // obj2 = {} -> type & validation error
 * ```
 */
export function EXACT_ARRAY<T extends any[], R extends any[] = PrepareExactArrayType<T>>(
    types: [...T],
    args?: MetaTypeArgs<EXACT_ARRAY<R>>
): R {
    return MetaType<EXACT_ARRAY<R>>(ExactArrayImpl.build({ ...args, subType: types })) as any
}

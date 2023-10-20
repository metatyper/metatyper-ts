import { MetaType, PrepareBaseType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'
import { TypeBuildError } from '../../errors/typeBuild.error'

export class ExactArrayImpl extends MetaTypeImpl {
    name = 'EXACT_ARRAY'
    subType: MetaTypeImpl[]

    prepareSubType(subType: any, args: MetaTypeArgs) {
        if (!Array.isArray(subType)) {
            throw new TypeBuildError(`subType must be an array`, ExactArrayImpl)
        }

        return subType.map((type: any) => {
            const metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(type, args?.subTypesDefaultArgs)

            if (!metaTypeImpl) {
                throw new TypeBuildError(
                    `Cannot get meta type for this value: ${type}`,
                    ExactArrayImpl
                )
            }

            return metaTypeImpl
        })
    }

    configure() {
        this.schema = {
            type: 'array',
            items: this.subType.map((metaType) => metaType.schema),
            minItems: this.subType.length,
            maxItems: this.subType.length
        }
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
 * const obj1 = Meta({ a: EXACT_ARRAY([1, 'string', BOOLEAN()]) }) // as { a : [number, string, boolean] }
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

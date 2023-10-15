import { MetaTypeImpl } from './metatypeImpl'

export const IsMetaTypeSymbol = Symbol('IsMetaType')
export const MetaTypeSymbol = Symbol('MetaType')
export const MetaTypeImplSymbol = Symbol('MetaTypeImpl')

export type PrepareBaseType<T> = T extends MetaTypeFlag
    ? T
    : T extends StringConstructor
    ? string
    : T extends NumberConstructor
    ? number
    : T extends BooleanConstructor
    ? boolean
    : T extends DateConstructor
    ? Date
    : T extends Date
    ? Date
    : T extends BigIntConstructor
    ? bigint
    : T extends new (...args: any[]) => infer U
    ? U
    : T extends []
    ? []
    : T extends (infer U)[]
    ? (U extends MetaTypeFlag ? U : PrepareBaseType<U>)[]
    : T extends { [key in string]: any }
    ? { [key in keyof T]: T[key] extends MetaTypeFlag ? T[key] : PrepareBaseType<T[key]> }
    : T

export type MetaTypeFlag = {
    [IsMetaTypeSymbol]?: true
}

export type MetaTypeProps<T, ImplT, R> = {
    [MetaTypeSymbol]?: MetaType<T, ImplT, R>
    [MetaTypeImplSymbol]?: ImplT
}

export type MetaTypeMethods<R> = {
    parse?: (value: any) => R
}

export type MetaType<T, ImplT = MetaTypeImpl, R = PrepareBaseType<T>> = R &
    MetaTypeFlag &
    MetaTypeProps<T, ImplT, R> &
    MetaTypeMethods<R>

export function MetaType<T = any, ImplT extends MetaTypeImpl = MetaTypeImpl>(
    metaTypeImpl: ImplT
): T {
    if (!metaTypeImpl) {
        return null
    }

    if (!(metaTypeImpl instanceof MetaTypeImpl)) {
        return null
    }

    const metaType = {
        [IsMetaTypeSymbol]: true,
        [MetaTypeSymbol]: null,
        [MetaTypeImplSymbol]: metaTypeImpl,

        [Symbol.for('nodejs.util.inspect.custom')]() {
            return metaTypeImpl.toString()
        },

        toString() {
            return metaTypeImpl.toString()
        },

        serialize(value: any) {
            return metaTypeImpl.serialize({ value, metaTypeImpl, place: 'serialize' })
        },

        deserialize(value: any) {
            return metaTypeImpl.deserialize({ value, metaTypeImpl, place: 'deserialize' })
        },

        validate(value: any) {
            return metaTypeImpl.validate(value)
        },

        parse(value: any): any {
            const newValue = metaTypeImpl.deserialize({
                value,
                metaTypeImpl,
                place: 'deserialize'
            })

            metaTypeImpl.validate(newValue)

            return newValue
        },

        get schema() {
            return JSON.parse(JSON.stringify(metaTypeImpl.schema))
        }
    }

    metaType[MetaTypeSymbol] = metaType

    return metaType as any
}

MetaType.isMetaType = (obj: any) => obj && !!obj[IsMetaTypeSymbol]
MetaType.getMetaImpl = (obj: any) => (obj && (obj[MetaTypeImplSymbol] as MetaTypeImpl)) || null

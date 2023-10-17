import { MetaTypeImpl, SchemaType } from './metatypeImpl'

export const IsMetaTypeSymbol = Symbol('IsMetaType')

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

export type MetaTypeProps<ImplT = MetaTypeImpl> = {
    metaTypeImpl?: ImplT
    schema?: SchemaType

    serialize?: (value: any) => any
    deserialize?: (value: any) => any
    validate?: (value: any) => boolean
    parse?: (value: any) => any
}

export type MetaType<T, ImplT = MetaTypeImpl, R = PrepareBaseType<T>> = R &
    MetaTypeFlag &
    MetaTypeProps<ImplT>

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

        get metaTypeImpl(): ImplT {
            return metaTypeImpl
        },

        get schema(): SchemaType {
            return JSON.parse(JSON.stringify(metaTypeImpl.schema))
        },

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
        }
    }

    return Object.freeze(metaType) as any
}

MetaType.isMetaType = (obj: any) => obj && !!obj[IsMetaTypeSymbol]

MetaType.getMetaImpl = (obj: any) => (obj && !!obj[IsMetaTypeSymbol] && obj?.metaTypeImpl) ?? null

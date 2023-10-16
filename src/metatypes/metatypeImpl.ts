import { JSONSchema7 } from 'json-schema'
import { StaticClass } from '../utils/classes'
import { MetaTypeSerializationError, MetaTypeValidationError } from '../errors'
import { MetaTypeValidator, NullableValidator } from '../validators'
import { AutoCastSerializer } from '../serializers'

export type SchemaType = JSONSchema7

type ValidationArgType = {
    metaTypeImpl: MetaTypeImpl
    value: any
    propName?: string
    targetObject?: object
}

type SerializationArgType = {
    metaTypeImpl: MetaTypeImpl
    value: any
    propName?: string
    targetObject?: object
}

export type ValidatorType = { name?: string; validate: (args: ValidationArgType) => boolean }

export type SerializePlaceType = 'get' | 'serialize'
export type DeSerializePlaceType = 'init' | 'set' | 'deserialize'

export type SerializerType = (
    | {
          serialize?: (args: SerializationArgType) => any
          deserialize: (args: SerializationArgType) => any
      }
    | {
          serialize: (args: SerializationArgType) => any
          deserialize?: (args: SerializationArgType) => any
      }
) & {
    name?: string
    serializePlaces?: SerializePlaceType[] | string[]
    deserializePlaces?: DeSerializePlaceType[] | string[]
}

/**
 * metatype build args
 *
 * @param name - override metatype name (name is used in description/inspect)
 * @param schema - json schema (you can get the entire schema of an object by calling Meta.getJsonSchema(obj))
 * @param subType - sub value / meta type that using for nested objects types (like array: string[], where string - subType)
 * @param default - default value (instead of null)
 * @param nullable - add a NullableValidator that checks for a non-null value
 * @param validators - an array of validators (validators check a value when an object property is assigned that value)
 * @param serializers - an array of serializers (Serializers are used for Meta.serialize(obj) and Meta.deserialize(obj))
 * @param noDefaultValidators - disable the validators that the metatype class has (default validators for all metatype instances)
 * @param noDefaultSerializers - disable the serializers that the metatype class has (default serializers for all metatype instances)
 * @param noBuiltinValidators - disable the validators that all metatype have (e.g. MetaTypeValidator that checks a type of values)
 * @param noBuiltinSerializers - disable the serializers that all metatype have (e.g. AutoCast that cast values, like number => date)
 *
 * @typeParam T - type of value (is used for 'default' param)
 */
export type MetaTypeArgs<T = any> = {
    name?: string
    schema?: SchemaType
    subType?: any
    default?: T
    nullable?: boolean
    validators?: ValidatorType[]
    serializers?: SerializerType[]
    noDefaultValidators?: boolean
    noDefaultSerializers?: boolean
    noBuiltinValidators?: boolean
    noBuiltinSerializers?: boolean
}

export class MetaTypeImpl {
    name: string = null
    schema: SchemaType = {}
    default: any = null
    nullable: boolean = true
    validators: ValidatorType[] = []
    serializers: SerializerType[] = []

    noDefaultValidators: boolean = false
    noDefaultSerializers: boolean = false

    noBuiltinValidators: boolean = false
    noBuiltinSerializers: boolean = false

    defaultValidators: ValidatorType[] = []
    defaultSerializers: SerializerType[] = []

    subType: any = null

    private static _metaTypesRegistry: Record<string, StaticClass<typeof MetaTypeImpl>> = {}

    static build<T extends MetaTypeImpl>(this: new (...args: any) => T, args?: MetaTypeArgs): T {
        const instance = new this()

        instance.init(args)
        instance.configure(args)

        return instance
    }

    protected init(args?: MetaTypeArgs) {
        this.noBuiltinSerializers = args?.noBuiltinSerializers ?? this.noBuiltinSerializers
        this.noBuiltinValidators = args?.noBuiltinValidators ?? this.noBuiltinValidators

        this.noDefaultSerializers = args?.noDefaultSerializers ?? this.noDefaultSerializers
        this.noDefaultValidators = args?.noDefaultValidators ?? this.noDefaultValidators

        this.subType = args?.subType ?? this.subType ?? null

        this.name =
            args?.name ||
            this.name ||
            (this['constructor'] as any).name?.replace('Impl', '')?.toUpperCase() ||
            'CUSTOM'

        this.schema = args?.schema || this.schema

        this.validators = args?.validators || this.validators || []
        this.serializers = args?.serializers || this.serializers || []

        this.default = args?.default !== undefined ? args?.default : this.default
        this.nullable = !!(args?.nullable ?? this.nullable ?? true)
    }

    protected configure(_args?: MetaTypeArgs) {}

    toString() {
        return `${this.name}`
    }

    [Symbol.for('nodejs.util.inspect.custom')]() {
        return this.toString()
    }

    castToType(args: SerializationArgType) {
        return args?.value
    }

    castToRawValue(args: SerializationArgType) {
        return args?.value
    }

    private _getAllSerializers(): SerializerType[] {
        const serializers = []

        if (!this.noBuiltinSerializers) {
            serializers.push(AutoCastSerializer)
        }

        if (!this.noBuiltinSerializers && this.defaultSerializers) {
            serializers.push(...this.defaultSerializers)
        }

        if (this.serializers) {
            serializers.push(...this.serializers)
        }

        return serializers
    }

    serialize(
        value: any,
        args?: {
            place?: SerializePlaceType
            targetObject?: object
            propName?: string
        }
    ) {
        const place = args?.place
        const serializers = this._getAllSerializers()
        const propName = args?.propName ?? null
        const targetObject = args?.targetObject ?? null

        serializers.forEach((serializer) => {
            if (!serializer?.serialize) {
                return
            }

            if (
                place &&
                serializer.serializePlaces &&
                !serializer.serializePlaces.includes(place)
            ) {
                return
            }

            try {
                value = serializer.serialize({
                    value,
                    metaTypeImpl: this,
                    propName,
                    targetObject
                })
            } catch (e) {
                throw new MetaTypeSerializationError({
                    serializer,
                    targetObject,
                    propName,
                    value,
                    metaTypeImpl: this,
                    place,
                    subError: e
                })
            }
        })

        return value
    }

    deserialize(
        value: any,
        args?: {
            place?: DeSerializePlaceType
            targetObject?: object
            propName?: string
        }
    ) {
        const place = args?.place
        const serializers = this._getAllSerializers()
        const propName = args?.propName ?? null
        const targetObject = args?.targetObject ?? null

        serializers.reverse().forEach((serializer) => {
            if (!serializer?.deserialize) {
                return
            }

            if (
                place &&
                serializer.deserializePlaces &&
                !serializer.deserializePlaces.includes(place)
            ) {
                return
            }

            try {
                value = serializer?.deserialize({
                    value,
                    metaTypeImpl: this,
                    propName,
                    targetObject
                })
            } catch (e) {
                throw new MetaTypeSerializationError({
                    serializer,
                    targetObject,
                    propName,
                    value,
                    metaTypeImpl: this,
                    place,
                    subError: e
                })
            }
        })

        return value
    }

    private _getAllValidators(): ValidatorType[] {
        const validators = []

        if (!this.nullable) {
            validators.push(NullableValidator)
        }

        if (!this.noBuiltinValidators) {
            validators.push(MetaTypeValidator)
        }

        if (!this.noDefaultValidators && this.defaultValidators) {
            validators.push(...this.defaultValidators)
        }

        if (this.validators) {
            validators.push(...this.validators)
        }

        return validators
    }

    validate(
        value: any,
        args?: {
            targetObject?: object
            propName?: string
        }
    ) {
        const validators = this._getAllValidators()
        const propName = args?.propName ?? null
        const targetObject = args?.targetObject ?? null

        for (const validator of validators) {
            let result: boolean

            try {
                result = validator.validate({
                    value,
                    metaTypeImpl: this,
                    propName: args?.propName ?? null,
                    targetObject: args?.targetObject ?? null
                })
            } catch (e) {
                throw new MetaTypeValidationError({
                    validator,
                    targetObject,
                    propName,
                    value,
                    metaTypeImpl: this,
                    subError: e
                })
            }

            if (!result)
                throw new MetaTypeValidationError({
                    validator,
                    targetObject,
                    propName,
                    value,
                    metaTypeImpl: this
                })
        }

        return true
    }

    isMetaTypeOf(value: any) {
        return (this as any).constructor.isCompatible(value)
    }

    static isCompatible(_value: any) {
        return false
    }

    static getCompatibilityScore(_value: any, _args?: MetaTypeArgs) {
        return -1
    }

    static registerMetaType(type: StaticClass<typeof MetaTypeImpl>) {
        MetaTypeImpl._metaTypesRegistry[type.name] = type
    }

    static getMetaType(valueToFind: any, args?: MetaTypeArgs): MetaType<unknown> {
        if (MetaType.isMetaType(valueToFind)) {
            return valueToFind as any
        }

        if (valueToFind instanceof MetaTypeImpl) {
            return MetaType(valueToFind)
        }

        let maxCompatibilityScore = -Infinity
        let maxCompatibilityScoreTypeImpl = null

        for (const metaTypeImpl of Object.values(this._metaTypesRegistry)) {
            if (metaTypeImpl.isCompatible(valueToFind)) {
                const compatibilityScore = metaTypeImpl.getCompatibilityScore(valueToFind, args)

                if (compatibilityScore > maxCompatibilityScore) {
                    maxCompatibilityScore = compatibilityScore
                    maxCompatibilityScoreTypeImpl = metaTypeImpl
                }
            }
        }

        if (!maxCompatibilityScoreTypeImpl) return null

        const metaTypeImplInstance = maxCompatibilityScoreTypeImpl.build({
            default: valueToFind,
            ...args
        })

        return MetaType(metaTypeImplInstance)
    }

    static getMetaTypeImpl(valueToFind: any, args?: MetaTypeArgs): MetaTypeImpl {
        const metaType = this.getMetaType(valueToFind, args)

        return MetaType.getMetaImpl(metaType) as any
    }
}

import { MetaType } from './metatype'

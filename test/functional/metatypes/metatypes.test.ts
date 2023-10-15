import { describe, expect, test } from '@jest/globals'

import { MetaType, MetaTypeImpl } from '../../../src/metatypes'
import { MetaTypeValidationError } from '../../../src/errors'

describe('MetaType and MetaTypeImpl', () => {
    test('MetaType.isMetaType', () => {
        const customMetaType = MetaType(MetaTypeImpl.build())

        expect(MetaType.isMetaType(customMetaType)).toBe(true)
        expect(MetaType.isMetaType({})).toBe(false)
    })

    test('MetaType.getMetaImpl', () => {
        const impl = MetaTypeImpl.build({
            name: 'CUSTOM',
            schema: {
                type: 'number'
            },
            noDefaultSerializers: true,
            noDefaultValidators: true,
            default: 1,
            nullable: false,
            subType: 1
        })
        const customMetaType = MetaType(impl)

        expect(MetaType.getMetaImpl(customMetaType)).toBe(impl)
    })

    test('making meta type', () => {
        const customMetaType1 = MetaType(MetaTypeImpl.build())
        const customMetaType2 = MetaType(new MetaTypeImpl())
        const customMetaType3 = MetaType(
            MetaTypeImpl.build({
                name: 'CUSTOM3',
                schema: {
                    type: 'number'
                },
                noDefaultSerializers: true,
                noDefaultValidators: true,
                default: 1,
                nullable: false,
                subType: 1,
                validators: [{ validate: () => true }]
            })
        )
        const customMetaType4 = MetaType(
            MetaTypeImpl.build({
                name: 'CUSTOM4',
                schema: {
                    type: 'string'
                },
                default: 1,
                nullable: true,
                subType: 1,
                validators: [{ validate: () => true }]
            })
        )

        expect(MetaType.isMetaType(customMetaType1)).toBe(true)
        expect(MetaType.isMetaType(customMetaType2)).toBe(true)
        expect(MetaType.isMetaType(customMetaType3)).toBe(true)
        expect(MetaType.isMetaType(customMetaType4)).toBe(true)

        const customMetaType1Impl = MetaType.getMetaImpl(customMetaType1)
        const customMetaType2Impl = MetaType.getMetaImpl(customMetaType2)
        const customMetaType3Impl = MetaType.getMetaImpl(customMetaType3)
        const customMetaType4Impl = MetaType.getMetaImpl(customMetaType4)

        expect(customMetaType1Impl.name).toBe('METATYPE')
        expect(customMetaType2Impl.name).toBe(null)
        expect(customMetaType3Impl.name).toBe('CUSTOM3')
        expect(customMetaType4Impl.name).toBe('CUSTOM4')

        expect(customMetaType1Impl.schema).toEqual({})
        expect(customMetaType2Impl.schema).toEqual({})
        expect(customMetaType3Impl.schema).toEqual({ type: 'number' })
        expect(customMetaType4Impl.schema).toEqual({ type: 'string' })

        expect(customMetaType1Impl['defaultSerializers'].length).toBe(0)
        expect(customMetaType2Impl['defaultSerializers'].length).toBe(0)
        expect(customMetaType3Impl['defaultSerializers'].length).toBe(0)
        expect(customMetaType4Impl['defaultSerializers'].length).toBe(0)

        expect(customMetaType1Impl.validators.length).toBe(0)
        expect(customMetaType2Impl.validators.length).toBe(0)
        expect(customMetaType3Impl.validators.length).toBe(1)
        expect(customMetaType4Impl.validators.length).toBe(1)
    })

    test('validating meta type', () => {
        const validator1 = { validate: ({ value }: any) => value === 1 }

        const metaTypeWith1ValidatorInImplClass = MetaType(
            class extends MetaTypeImpl {
                validators = [validator1]
            }.build({
                noBuiltinValidators: true,
                noBuiltinSerializers: true,
                noDefaultValidators: true,
                noDefaultSerializers: true
            })
        )

        expect(MetaType.getMetaImpl(metaTypeWith1ValidatorInImplClass).validate(1)).toBe(true)
        expect(() =>
            MetaType.getMetaImpl(metaTypeWith1ValidatorInImplClass).validate(2)
        ).toThrowError(MetaTypeValidationError)

        const validator2_1 = {
            validate: ({ value }: any) => value === '2' || value === '1'
        }

        const validator2_2 = { validate: ({ value }: any) => value === '2' || value === 1 }
        const validator2_3 = { validate: ({ value }: any) => value === '2' || value === '3' }
        const validator2_4 = { validate: ({ value }: any) => value === '2' || value === 3 }

        const metaTypeWithValidatorsOverlap = MetaType(
            class extends MetaTypeImpl {
                validators = [validator2_1, validator2_3]

                isMetaTypeOf() {
                    return true
                }
            }.build({
                validators: [validator2_2, validator2_4]
            })
        )

        expect(MetaType.getMetaImpl(metaTypeWithValidatorsOverlap).validate('2')).toBe(true)
        expect(() =>
            MetaType.getMetaImpl(metaTypeWithValidatorsOverlap).validate('1')
        ).toThrowError(MetaTypeValidationError)
        expect(() => MetaType.getMetaImpl(metaTypeWithValidatorsOverlap).validate(1)).toThrowError(
            MetaTypeValidationError
        )
        expect(() => MetaType.getMetaImpl(metaTypeWithValidatorsOverlap).validate(3)).toThrowError(
            MetaTypeValidationError
        )
        expect(() =>
            MetaType.getMetaImpl(metaTypeWithValidatorsOverlap).validate('3')
        ).toThrowError(MetaTypeValidationError)

        const TypeWithMetaTypeValidator = MetaType(
            class extends MetaTypeImpl {
                isMetaTypeOf(value: any) {
                    return value === 2
                }
            }.build()
        )

        expect(() => MetaType.getMetaImpl(TypeWithMetaTypeValidator).validate(1)).toThrowError(
            MetaTypeValidationError
        )
        expect(MetaType.getMetaImpl(TypeWithMetaTypeValidator).validate(2)).toBe(true)

        const TypeWithMetaTypeValidator2 = MetaType(
            class extends MetaTypeImpl {
                static isCompatible(value: any) {
                    return value === 3
                }
            }.build()
        )

        expect(() => MetaType.getMetaImpl(TypeWithMetaTypeValidator2).validate(1)).toThrowError(
            MetaTypeValidationError
        )
        expect(MetaType.getMetaImpl(TypeWithMetaTypeValidator2).validate(3)).toBe(true)
    })

    test('serializing meta type', () => {
        const serializer1 = {
            serialize: ({ value }: any) => {
                return {
                    value
                }
            },
            deserialize: ({ value }: any) => value.value
        }

        const serializer2 = {
            serialize: ({ value }: any) => {
                return {
                    value2: value
                }
            },
            deserialize: ({ value }: any) => value.value2
        }

        const customMetaType = MetaType(
            class extends MetaTypeImpl {
                serializers = [serializer1]
            }.build({
                noDefaultValidators: true,
                noDefaultSerializers: true,
                noBuiltinValidators: true,
                noBuiltinSerializers: true
            })
        )

        expect(MetaType.getMetaImpl(customMetaType).serialize(1)).toMatchObject({ value: 1 })
        expect(MetaType.getMetaImpl(customMetaType).deserialize({ value: 1 })).toBe(1)

        const customMetaTypeWithSerializersOverlap = MetaType(
            class extends MetaTypeImpl {
                serializers = [serializer2]
            }.build({
                serializers: [serializer1],
                noDefaultValidators: true,
                noDefaultSerializers: true,
                noBuiltinValidators: true,
                noBuiltinSerializers: true
            })
        )

        expect(
            MetaType.getMetaImpl(customMetaTypeWithSerializersOverlap).serialize(1)
        ).toMatchObject({ value: 1 })
        expect(
            MetaType.getMetaImpl(customMetaTypeWithSerializersOverlap).deserialize({ value: 1 })
        ).toBe(1)

        const customMetaTypeWithTypeCasting = MetaType(
            class extends MetaTypeImpl {
                castToType({ value }) {
                    return value.value
                }
            }.build()
        )

        expect(MetaType.getMetaImpl(customMetaTypeWithTypeCasting).serialize(1)).toBe(1)
        expect(MetaType.getMetaImpl(customMetaTypeWithTypeCasting).deserialize({ value: 1 })).toBe(
            1
        )
    })
})

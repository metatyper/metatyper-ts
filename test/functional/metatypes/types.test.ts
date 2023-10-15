import { describe, expect, test } from '@jest/globals'

import {
    NUMBER,
    NumberImpl,
    STRING,
    StringImpl,
    BOOLEAN,
    BooleanImpl,
    BIGINT,
    BigIntImpl,
    INTEGER,
    IntegerImpl,
    DATE,
    DateImpl,
    ANY,
    AnyImpl,
    ANY_OF,
    AnyOfImpl,
    ARRAY,
    ArrayImpl,
    EXACT_ARRAY,
    ExactArrayImpl,
    OBJECT,
    ObjectImpl,
    LITERAL,
    LiteralImpl,
    MetaType
} from '../../../src/metatypes'

describe('MetaType and MetaTypeImpl', () => {
    test('NUMBER', () => {
        const metaType = NUMBER()
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(NumberImpl.isCompatible(1)).toBe(true)
        expect(NumberImpl.isCompatible('1')).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(NumberImpl)
        expect(metaTypeImpl['schema']).toEqual({ type: 'number' })
    })

    test('STRING', () => {
        const metaType = STRING()
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(StringImpl.isCompatible(1)).toBe(false)
        expect(StringImpl.isCompatible('1')).toBe(true)
        expect(StringImpl.isCompatible(Symbol('1'))).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(StringImpl)
        expect(metaTypeImpl['schema']).toEqual({ type: 'string' })

        expect(metaTypeImpl.castToType({ value: 1, metaTypeImpl })).toBe('1')
        expect(metaTypeImpl.castToType({ value: '2', metaTypeImpl })).toBe('2')
        expect(metaTypeImpl.castToType({ value: Symbol('3'), metaTypeImpl })).toBe('3')
    })

    test('BOOLEAN', () => {
        const metaType = BOOLEAN()
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(BooleanImpl.isCompatible(1)).toBe(false)
        expect(BooleanImpl.isCompatible(true)).toBe(true)
        expect(metaTypeImpl['constructor']).toBe(BooleanImpl)
        expect(metaTypeImpl['schema']).toEqual({ type: 'boolean' })

        expect(metaTypeImpl.castToType({ value: 1, metaTypeImpl })).toBe(true)
        expect(metaTypeImpl.castToType({ value: 0, metaTypeImpl })).toBe(false)
        expect(metaTypeImpl.castToType({ value: 'any string', metaTypeImpl })).toBe('any string')
        expect(metaTypeImpl.castToType({ value: undefined, metaTypeImpl })).toBe(undefined)
        expect(metaTypeImpl.castToType({ value: null, metaTypeImpl })).toBe(null)
    })

    test('BIGINT', () => {
        const metaType = BIGINT()
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(BigIntImpl.isCompatible(1n)).toBe(true)
        expect(BigIntImpl.isCompatible(1)).toBe(false)
        expect(BigIntImpl.isCompatible('1')).toBe(false)
        expect(BigIntImpl.isCompatible('1a')).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(BigIntImpl)
        expect(metaTypeImpl['schema']).toEqual({
            type: 'string',
            pattern: '^([-+]?[0-9]+)$'
        })

        expect(metaTypeImpl.castToRawValue({ value: 1n, metaTypeImpl })).toBe('1')
        expect(metaTypeImpl.castToRawValue({ value: -1n, metaTypeImpl })).toBe('-1')
        expect(metaTypeImpl.castToRawValue({ value: -0n, metaTypeImpl })).toBe('0')
        expect(metaTypeImpl.castToType({ value: 1n, metaTypeImpl })).toBe(1n)
        expect(metaTypeImpl.castToType({ value: 0, metaTypeImpl })).toBe(0n)
        expect(metaTypeImpl.castToType({ value: 1, metaTypeImpl })).toBe(1n)
        expect(metaTypeImpl.castToType({ value: '1', metaTypeImpl })).toBe(1n)
        expect(metaTypeImpl.castToType({ value: '-1', metaTypeImpl })).toBe(-1n)
        expect(metaTypeImpl.castToType({ value: '-1b', metaTypeImpl })).toBe('-1b')
        expect(metaTypeImpl.castToType({ value: undefined, metaTypeImpl })).toBe(undefined)
        expect(metaTypeImpl.castToType({ value: null, metaTypeImpl })).toBe(null)
    })

    test('INTEGER', () => {
        const metaType = INTEGER()
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(IntegerImpl.isCompatible(1)).toBe(true)
        expect(IntegerImpl.isCompatible(1.0)).toBe(true)
        expect(IntegerImpl.isCompatible(1.5)).toBe(false)
        expect(IntegerImpl.isCompatible('1')).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(IntegerImpl)
        expect(metaTypeImpl['schema']).toEqual({
            type: 'integer'
        })

        expect(metaTypeImpl.castToType({ value: 1.9, metaTypeImpl })).toBe(1)
        expect(metaTypeImpl.castToType({ value: -1.9, metaTypeImpl })).toBe(-1)
        expect(metaTypeImpl.castToType({ value: 1, metaTypeImpl })).toBe(1)
        expect(metaTypeImpl.castToType({ value: '1', metaTypeImpl })).toBe('1')
        expect(metaTypeImpl.castToType({ value: undefined, metaTypeImpl })).toBe(undefined)
        expect(metaTypeImpl.castToType({ value: null, metaTypeImpl })).toBe(null)
    })

    test('DATE', () => {
        const metaType = DATE()
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(DateImpl.isCompatible(new Date())).toBe(true)
        expect(DateImpl.isCompatible(123123123)).toBe(true)
        expect(DateImpl.isCompatible('01.01.2000')).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(DateImpl)
        expect(metaTypeImpl['schema']).toEqual({
            type: 'number'
        })

        expect(
            metaTypeImpl.castToRawValue({
                value: new Date(1),
                metaTypeImpl: null
            })
        ).toBe(1)
        expect(metaTypeImpl.castToType({ value: 1, metaTypeImpl })).toStrictEqual(new Date(1))
        expect(metaTypeImpl.castToType({ value: '1', metaTypeImpl })).toBe('1')
        expect(metaTypeImpl.castToType({ value: undefined, metaTypeImpl })).toBe(undefined)
        expect(metaTypeImpl.castToType({ value: null, metaTypeImpl })).toBe(null)
    })

    test('ANY', () => {
        const metaType = ANY()
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(AnyImpl.isCompatible(1)).toBe(true)
        expect(AnyImpl.isCompatible('1')).toBe(true)
        expect(AnyImpl.isCompatible(true)).toBe(true)
        expect(AnyImpl.isCompatible(null)).toBe(true)
        expect(metaTypeImpl['constructor']).toBe(AnyImpl)
        expect(metaTypeImpl['schema']).toEqual({})
    })

    test('ANY_OF', () => {
        const metaType = ANY_OF([1n, NUMBER(), String, true])
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf(1)).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf(1n)).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf('1')).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf(false)).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf(new Date())).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(AnyOfImpl)
        expect(metaTypeImpl['schema']).toEqual({
            anyOf: [
                {
                    type: 'string',
                    pattern: '^([-+]?[0-9]+)$'
                },
                {
                    type: 'number'
                },
                {
                    type: 'string'
                },
                {
                    type: 'boolean'
                }
            ]
        })

        expect(metaTypeImpl.castToType({ value: '1', metaTypeImpl })).toBe('1')
        expect(metaTypeImpl.castToType({ value: '1b', metaTypeImpl })).toBe('1b')
        expect(metaTypeImpl.castToType({ value: -1.9, metaTypeImpl })).toBe(-1.9)
        expect(metaTypeImpl.castToType({ value: 1, metaTypeImpl })).toBe(1)
        expect(metaTypeImpl.castToType({ value: 1n, metaTypeImpl })).toBe(1n)
        expect(metaTypeImpl.castToType({ value: true, metaTypeImpl })).toBe(true)
        expect(metaTypeImpl.castToType({ value: undefined, metaTypeImpl })).toBe(undefined)
        expect(metaTypeImpl.castToType({ value: null, metaTypeImpl })).toBe(null)
    })

    test('ARRAY', () => {
        const metaType = ARRAY([1n, NUMBER(), String, true], {
            notEmpty: true
        })
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(ArrayImpl.isCompatible([1])).toBe(true)
        expect(ArrayImpl.isCompatible(1)).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf([1])).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf([1n])).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf(['1', 1])).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf([false, '2'])).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf([1, new Date()])).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf(1)).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(ArrayImpl)
        expect(metaTypeImpl['schema']).toEqual({
            type: 'array',
            items: {
                anyOf: [
                    {
                        type: 'string',
                        pattern: '^([-+]?[0-9]+)$'
                    },
                    {
                        type: 'number'
                    },
                    {
                        type: 'string'
                    },
                    {
                        type: 'boolean'
                    }
                ]
            },
            minItems: 1
        })
        expect(MetaType.getMetaImpl(ARRAY(1))['schema']).toEqual({
            type: 'array',
            items: {
                type: 'number'
            },
            minItems: 0
        })
    })

    test('EXACT_ARRAY', () => {
        const metaType = EXACT_ARRAY([1n, NUMBER(), String, true])
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(ExactArrayImpl.isCompatible([1])).toBe(true)
        expect(ExactArrayImpl.isCompatible(1)).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf([1])).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf([1n])).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf(['1', 1])).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf([false, '2'])).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf([1, new Date()])).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf(1)).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf([2n, 2, '3', false])).toBe(true)
        expect(metaTypeImpl['constructor']).toBe(ExactArrayImpl)
        expect(metaTypeImpl['schema']).toEqual({
            type: 'array',
            items: [
                {
                    type: 'string',
                    pattern: '^([-+]?[0-9]+)$'
                },
                {
                    type: 'number'
                },
                {
                    type: 'string'
                },
                {
                    type: 'boolean'
                }
            ],
            minItems: 4,
            maxItems: 4
        })
    })

    test('OBJECT', () => {
        const metaType = OBJECT({
            a: String,
            b: NUMBER()
        })
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(ObjectImpl.isCompatible({})).toBe(true)
        expect(ObjectImpl.isCompatible([1])).toBe(false)
        expect(ObjectImpl.isCompatible(1)).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf([1])).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf(1)).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf({})).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf({ a: '1', b: '2' })).toBe(false)
        expect(metaTypeImpl.isMetaTypeOf({ a: '1', b: 2 })).toBe(true)
        expect(metaTypeImpl['constructor']).toBe(ObjectImpl)
        expect(metaTypeImpl['schema']).toEqual({
            type: 'object',
            properties: {
                a: {
                    type: 'string'
                },
                b: {
                    type: 'number'
                }
            }
        })
    })

    test('LITERAL', () => {
        const metaType = LITERAL(1)
        const metaTypeImpl = MetaType.getMetaImpl(metaType)

        expect(MetaType.isMetaType(metaType)).toBe(true)
        expect(LiteralImpl.isCompatible()).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf(1)).toBe(true)
        expect(metaTypeImpl.isMetaTypeOf(2)).toBe(false)
        expect(metaTypeImpl['constructor']).toBe(LiteralImpl)
        expect(metaTypeImpl['schema']).toEqual({
            const: 1
        })
    })
})

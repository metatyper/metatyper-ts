import { describe, expect, test } from '@jest/globals'

import { Meta } from '../../src/meta'
import { MetaTypeValidationError } from '../../src/errors'
import { NUMBER, STRING } from '../../src/metatypes'

describe('Meta objects', () => {
    test('MetaObject', () => {
        const SymbolA = Symbol('a')
        const SymbolB = Symbol('b')

        let _a = {} as any
        let _b = {} as any

        const origObjA = {
            a: 0,
            a1: NUMBER({
                default: 1,
                serializers: [
                    {
                        serialize({ value }) {
                            return value + 5
                        },
                        deserialize({ value }) {
                            return value - 10
                        }
                    }
                ],
                validators: [{ validate: ({ value }) => value < 20 }]
            }),
            base: 2,
            [SymbolA]: -1,
            toString() {
                return 'a'
            },
            func() {
                return this
            },
            get _a() {
                return this
            },
            set _a(value: any) {
                _a = [value, this]
            }
        } as Record<string | symbol, any>
        const origObjB = {
            b: '3',
            b1: STRING(),
            base: '5',
            [SymbolB]: -2,
            toString() {
                return 'b'
            },
            func() {
                return this
            },
            get _b() {
                return this
            },
            set _b(value: any) {
                _b = [value, this]
            }
        } as Record<string | symbol, any>

        const metaObjA = Meta(origObjA)
        const metaObjB = Meta(origObjB)

        expect(metaObjA.a).toBe(0)
        metaObjA.a = 1
        expect(metaObjA.a).toBe(1)
        expect(() => {
            metaObjA.a = '2'
        }).toThrowError(MetaTypeValidationError)
        expect(metaObjA.a).toBe(1)

        expect(() => {
            metaObjA.a1 = 100
        }).toThrowError(MetaTypeValidationError)

        expect(metaObjA.a1).toBe(-4)
        expect(metaObjA.base).toBe(2)
        expect(metaObjA[SymbolA]).toBe(-1)
        expect(metaObjA.toString()).toBe('a')
        expect(metaObjA.func()).toBe(metaObjA)
        expect(metaObjA['_a']).toBe(metaObjA)
        metaObjA._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(metaObjA)

        expect(metaObjB.a).toBe(undefined)
        expect(metaObjB.a1).toBe(undefined)
        expect(metaObjB[SymbolA]).toBe(undefined)

        Object.setPrototypeOf(origObjB, origObjA)

        expect(metaObjB.b).toBe('3')
        expect(metaObjB.b1).toBe(null)
        expect(metaObjB.base).toBe('5')
        expect(metaObjB[SymbolB]).toBe(-2)
        expect(metaObjB.toString()).toBe('b')
        expect(metaObjB.func()).toBe(metaObjB)
        expect(metaObjB['_b']).toBe(metaObjB)
        metaObjB._b = 1
        expect(_b[0]).toBe(1)
        expect(_b[1]).toBe(metaObjB)

        expect(metaObjB.a).toBe(0)
        expect(metaObjB.a1).toBe(6)
        expect(metaObjB[SymbolA]).toBe(-1)
        expect(metaObjB['_a']).toBe(metaObjB)
        metaObjB._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(metaObjB)
    })

    test('MetaClass', () => {
        let _a = {} as any
        let _b = {} as any
        let _c = {} as any

        class OrigA {
            a = 0
            a1 = NUMBER({
                default: 1,
                serializers: [
                    {
                        serialize({ value }) {
                            return value + 5
                        },
                        deserialize({ value }) {
                            return value - 10
                        }
                    }
                ],
                validators: [{ validate: ({ value }) => value < 20 }]
            })
            base = 5

            toString() {
                return 'a'
            }

            func() {
                return this
            }

            get _a() {
                return this
            }

            set _a(value: any) {
                _a = [value, this]
            }

            static a = 10
            static a1 = NUMBER({
                default: 1,
                serializers: [
                    {
                        serialize({ value }) {
                            return value + 5
                        },
                        deserialize({ value }) {
                            return value - 10
                        }
                    }
                ],
                validators: [{ validate: ({ value }) => value < 20 }]
            })

            static base = 5

            static toString() {
                return 'a'
            }

            static func() {
                return this
            }

            static get _a() {
                return this
            }

            static set _a(value: any) {
                _a = [value, this]
            }
        }

        class OrigB extends OrigA {
            b = 0
            b1 = NUMBER({
                serializers: [
                    {
                        serialize({ value }) {
                            return value + 5
                        },
                        deserialize({ value }) {
                            return value - 10
                        }
                    }
                ],
                validators: [{ validate: ({ value }) => value < 20 }]
            })

            base = 6

            toString() {
                return 'b'
            }

            func() {
                return this
            }

            get _b() {
                return this
            }

            set _b(value: any) {
                _b = [value, this]
            }

            static b = 10
            static b1 = NUMBER({
                serializers: [
                    {
                        serialize({ value }) {
                            return value + 5
                        },
                        deserialize({ value }) {
                            return value - 10
                        }
                    }
                ],
                validators: [{ validate: ({ value }) => value < 20 }]
            })

            static base = 6

            static toString() {
                return 'b'
            }

            static func() {
                return this
            }

            static get _b() {
                return this
            }

            static set _b(value: any) {
                _b = [value, this]
            }
        }

        const MetaClsA = Meta(OrigA)
        const MetaClsB = Meta(OrigB)

        class MetaChildC extends MetaClsB {
            c = 20
            c1 = NUMBER({
                default: 19,
                serializers: [
                    {
                        serialize({ value }) {
                            return value + 5
                        },
                        deserialize({ value }) {
                            return value - 10
                        }
                    }
                ],
                validators: [{ validate: ({ value }) => value < 20 }]
            })

            base = 26

            toString() {
                return 'c'
            }

            func() {
                return this
            }

            get _c() {
                return this
            }

            set _c(value: any) {
                _c = [value, this]
            }

            static c = 10
            static c1 = NUMBER({
                serializers: [
                    {
                        serialize({ value }) {
                            return value + 5
                        },
                        deserialize({ value }) {
                            return value - 10
                        }
                    }
                ],
                validators: [{ validate: ({ value }) => value < 20 }]
            })

            static base = 6

            static toString() {
                return 'c'
            }

            static func() {
                return this
            }

            static get _c() {
                return this
            }

            static set _c(value: any) {
                _c = [value, this]
            }
        }

        const MetaClsC = Meta(MetaChildC)

        // static cls MetaClsA

        expect(MetaClsA.a).toBe(10)
        MetaClsA.a = 1
        expect(MetaClsA.a).toBe(1)
        expect(() => {
            MetaClsA.a = '2' as any
        }).toThrowError(MetaTypeValidationError)
        expect(MetaClsA.a).toBe(1)

        expect(() => {
            MetaClsA.a1 = 100
        }).toThrowError(MetaTypeValidationError)

        expect(MetaClsA.a1).toBe(-4)
        expect(MetaClsA.base).toBe(5)
        expect(MetaClsA.toString()).toBe('a')
        expect(MetaClsA.func()).toBe(MetaClsA)
        expect(MetaClsA['_a']).toBe(MetaClsA)
        MetaClsA._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(MetaClsA)

        // static cls MetaClsB

        expect(MetaClsB.b).toBe(10)
        expect(MetaClsB.b1).toBe(-5)
        expect(MetaClsB.base).toBe(6)
        expect(MetaClsB.toString()).toBe('b')
        expect(MetaClsB.func()).toBe(MetaClsB)
        expect(MetaClsB['_b']).toBe(MetaClsB)
        MetaClsB._b = 1
        expect(_b[0]).toBe(1)
        expect(_b[1]).toBe(MetaClsB)

        expect(MetaClsB.a).toBe(10)
        expect(MetaClsB.a1).toBe(6)
        expect(MetaClsB['_a']).toBe(MetaClsB)
        MetaClsB._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(MetaClsB)

        // static cls MetaChildC

        expect(MetaChildC.c).toBe(10)
        expect(MetaChildC.c1).toBe(-5)
        expect(MetaChildC.base).toBe(6)
        expect(MetaChildC.toString()).toBe('c')
        expect(MetaChildC.func()).toBe(MetaChildC)
        expect(MetaChildC['_c']).toBe(MetaChildC)
        MetaChildC._c = 1
        expect(_c[0]).toBe(1)
        expect(_c[1]).toBe(MetaChildC)

        expect(MetaChildC.a).toBe(10)
        expect(MetaChildC.a1).toBe(6)
        expect(MetaChildC['_a']).toBe(MetaChildC)
        MetaChildC._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(MetaChildC)

        expect(Meta.serialize(MetaChildC)).toMatchObject({
            base: 6,
            c: 10,
            c1: -5
        })

        expect(() => {
            Meta.deserialize(MetaChildC, { c1: 100 })
        }).toThrowError(MetaTypeValidationError)

        expect(MetaChildC.c1).toBe(-5)
        Meta.deserialize(MetaChildC, { c1: 20 })
        expect(MetaChildC.c1).toBe(15)

        // static cls MetaClsC

        expect(MetaClsC.c).toBe(10)
        expect(MetaClsC.c1).toBe(15)
        expect(MetaClsC.base).toBe(6)
        expect(MetaClsC.toString()).toBe('c')
        expect(MetaClsC.func()).toBe(MetaClsC)
        expect(MetaClsC['_c']).toBe(MetaClsC)
        MetaClsC._c = 1
        expect(_c[0]).toBe(1)
        expect(_c[1]).toBe(MetaClsC)

        expect(MetaClsC.a).toBe(10)
        expect(MetaClsC.a1).toBe(6)
        expect(MetaClsC['_a']).toBe(MetaClsC)
        MetaClsC._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(MetaClsC)

        expect(Meta.serialize(MetaClsC)).toMatchObject({
            base: 6,
            c: 10,
            c1: 15
        })

        expect(() => {
            Meta.deserialize(MetaClsC, { c1: 100 })
        }).toThrowError(MetaTypeValidationError)

        expect(MetaClsC.c1).toBe(15)
        Meta.deserialize(MetaClsC, { c1: 25 })
        expect(MetaClsC.c1).toBe(20)

        // instances

        const metaA = new MetaClsA()
        const metaB = new MetaClsB()
        const metaC = new MetaClsC()
        const metaChildC = new MetaChildC()

        // metaA

        expect(metaA.a).toBe(0)
        metaA.a = 1
        expect(metaA.a).toBe(1)
        expect(() => {
            metaA.a = '2' as any
        }).toThrowError(MetaTypeValidationError)
        expect(metaA.a).toBe(1)

        expect(() => {
            metaA.a1 = 100
        }).toThrowError(MetaTypeValidationError)

        expect(metaA.a1).toBe(-4)
        expect(metaA.base).toBe(5)
        expect(metaA.toString()).toBe('a')
        expect(metaA.func()).toBe(metaA)
        expect(metaA['_a']).toBe(metaA)
        metaA._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(metaA)

        // metaB

        expect(metaB.b).toBe(0)
        expect(metaB.b1).toBe(-5)
        expect(metaB.base).toBe(6)
        expect(metaB.toString()).toBe('b')
        expect(metaB.func()).toBe(metaB)
        expect(metaB['_b']).toBe(metaB)
        metaB._b = 1
        expect(_b[0]).toBe(1)
        expect(_b[1]).toBe(metaB)

        expect(metaB.a).toBe(0)
        expect(metaB.a1).toBe(-4)
        expect(metaB['_a']).toBe(metaB)
        metaB._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(metaB)

        // metaChildC

        expect(metaChildC.c).toBe(20)
        expect(metaChildC.c1).toBe(14)
        expect(metaChildC.base).toBe(26)
        expect(metaChildC.toString()).toBe('c')
        expect(metaChildC.func()).toBe(metaChildC)
        expect(metaChildC['_c']).toBe(metaChildC)
        metaChildC._c = 1
        expect(_c[0]).toBe(1)
        expect(_c[1]).toBe(metaChildC)

        expect(metaChildC.a).toBe(0)
        expect(metaChildC.a1).toBe(-4)
        expect(metaChildC['_a']).toBe(metaChildC)
        metaChildC._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(metaChildC)

        expect(Meta.serialize(metaChildC)).toMatchObject({
            a: 0,
            a1: -4,
            base: 26,
            b: 0,
            b1: -5,
            c: 20,
            c1: 14
        })

        expect(() => {
            Meta.deserialize(metaChildC, { a1: 100 })
        }).toThrowError(MetaTypeValidationError)

        expect(metaChildC.a1).toBe(-4)
        Meta.deserialize(metaChildC, { a1: 20 })
        expect(metaChildC.a1).toBe(15)

        // metaC

        expect(metaC.c).toBe(20)
        expect(metaC.c1).toBe(14)
        expect(metaC.base).toBe(26)
        expect(metaC.toString()).toBe('c')
        expect(metaC.func()).toBe(metaC)
        expect(metaC['_c']).toBe(metaC)
        metaC._c = 1
        expect(_c[0]).toBe(1)
        expect(_c[1]).toBe(metaC)

        expect(metaC.a).toBe(0)
        expect(metaC.a1).toBe(-4)
        expect(metaC['_a']).toBe(metaC)
        metaC._a = 1
        expect(_a[0]).toBe(1)
        expect(_a[1]).toBe(metaC)

        expect(Meta.serialize(metaC)).toMatchObject({
            a: 0,
            a1: -4,
            base: 26,
            b: 0,
            b1: -5,
            c: 20,
            c1: 14
        })

        expect(() => {
            Meta.deserialize(metaC, { a1: 100 })
        }).toThrowError(MetaTypeValidationError)

        expect(metaC.a1).toBe(-4)
        Meta.deserialize(metaC, { a1: 20 })
        expect(metaC.a1).toBe(15)
    })
})

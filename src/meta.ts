import {
    AnyImpl,
    MetaType,
    MetaTypeArgs,
    MetaTypeFlag,
    MetaTypeImpl,
    SchemaType
} from './metatypes'
import { isClass, inspectMetaValue } from './utils'

export const IsMetaObjectSymbol = Symbol('[[IsMetaObject]]')
export const MetaObjectNameSymbol = Symbol('[[MetaObjectName]]')
export const MetaObjectPropsIgnoreSymbol = Symbol('[[MetaObjectPropsIgnore]]')
export const MetaObjectValidationIsActiveSymbol = Symbol('[[MetaObjectValidationIsActive]]')
export const MetaObjectSerializationIsActiveSymbol = Symbol('[[MetaObjectSerializationIsActive]]')
export const MetaObjectInitialDeclarationsSymbol = Symbol('[[MetaObjectInitialDeclarations]]')
export const MetaObjectDeclarationSymbol = Symbol('[[MetaObjectDeclaration]]')
export const MetaObjectValuesSymbol = Symbol('[[MetaObjectValues]]')
export const MetaObjectTypesDefaultArgsSymbol = Symbol('[[MetaObjectTypesDefaultArgs]]')

/**
 * Meta args
 *
 * @param name - meta object name (used in toString)
 * @param propsIgnore - enable default js logic for properties
 * @param disableValidation - disable all validators
 * @param disableSerialization - disable all serializers
 * @param disableInheritance - the meta object will not have a prototype
 * @param instanceArgs - MetaArgs for configuring function/class meta instances
 * @param metaTypesArgs - MetaTypeArgs for configuring all Meta types
 */
export type MetaArgs = {
    name?: string
    propsIgnore?: string[]
    disableValidation?: boolean
    disableSerialization?: boolean
    disableInheritance?: boolean
    instanceArgs?: MetaArgs
    metaTypesDefaultArgs?: MetaTypeArgs | ((metaTypeImpl: MetaTypeImpl) => MetaTypeArgs)
}

export function isMetaObject(obj: object) {
    return (
        obj instanceof Object && !!Reflect.getOwnPropertyDescriptor(obj, IsMetaObjectSymbol)?.value
    )
}

function initMetaObject(targetObject: object, origObj: object) {
    if (!origObj) {
        origObj = targetObject
    }

    // obj is not a meta obj
    if (!isMetaObject(targetObject)) {
        return null
    }

    const doSerialize = targetObject[MetaObjectSerializationIsActiveSymbol] || false

    const propsIgnore = targetObject[MetaObjectPropsIgnoreSymbol] || []
    const descriptors: Record<string, PropertyDescriptor> = {}
    const declarations: Record<string, MetaTypeImpl> = targetObject[MetaObjectDeclarationSymbol]
    const values: Record<string, any> = targetObject[MetaObjectValuesSymbol]

    if (targetObject[MetaObjectInitialDeclarationsSymbol]) {
        for (const [propName, declaration] of Object.entries<any>(
            targetObject[MetaObjectInitialDeclarationsSymbol]
        )) {
            declarations[propName] = declaration
            descriptors[propName] = {
                value: declaration.default,
                writable: true,
                configurable: true
            }
        }
    }

    for (const propName of Reflect.ownKeys(origObj)) {
        if (typeof propName === 'string' && !propsIgnore?.includes(propName)) {
            const descriptor = Reflect.getOwnPropertyDescriptor(origObj, propName)

            descriptors[propName] = { ...descriptor }
        }
    }

    Object.entries(descriptors)
        .map(([propName, descriptor]) => {
            if (descriptor.get || descriptor.set) {
                Reflect.deleteProperty(values, propName)
                Reflect.defineProperty(values, propName, descriptor)

                return null
            }

            if (descriptor.value === undefined) return null

            let declaration: MetaTypeImpl = null

            const defaultMetaTypeArgs = targetObject[MetaObjectTypesDefaultArgsSymbol] || {}

            if (descriptor.value instanceof MetaTypeImpl) {
                declaration = descriptor.value.rebuild(defaultMetaTypeArgs)

                descriptor.value = declaration?.default ?? null
            } else if (MetaType.isMetaType(descriptor.value)) {
                declaration = MetaType.getMetaImpl(descriptor.value)

                if (defaultMetaTypeArgs) {
                    declaration = declaration.rebuild(defaultMetaTypeArgs)
                }

                descriptor.value = declaration?.default ?? null
            } else {
                declaration = MetaTypeImpl.getMetaTypeImpl(descriptor.value, defaultMetaTypeArgs)
            }

            if (doSerialize && declaration) {
                descriptor.value = declaration.deserialize(descriptor.value, {
                    place: 'init',
                    propName,
                    targetObject
                })
            }

            return [propName, declaration, descriptor]
        })
        .filter((entry: any) => entry)
        .forEach(
            ([propName, declaration, descriptor]: [string, MetaTypeImpl, PropertyDescriptor]) => {
                if (declaration) declarations[propName] = declaration

                Reflect.deleteProperty(values, propName)
                Reflect.defineProperty(values, propName, descriptor)
            }
        )
}

function addDeclaration(obj: object, propName: string, propValue: any, rewrite = false) {
    const declarations = getMetaObjectDeclarations(obj)

    if (!declarations) {
        return null
    }

    if (!declarations[propName] || rewrite) {
        const args = obj[MetaObjectTypesDefaultArgsSymbol] || {}

        const declaration = MetaTypeImpl.getMetaTypeImpl(propValue, args) || AnyImpl.build(args)

        declarations[propName] = declaration
    }

    return declarations[propName]
}

function getMetaObjectDeclarations(obj: object) {
    const descriptor = Reflect.getOwnPropertyDescriptor(obj, MetaObjectDeclarationSymbol)

    return descriptor?.value || null
}

function getMetaObjectValues(obj: object) {
    const descriptor = Reflect.getOwnPropertyDescriptor(obj, MetaObjectValuesSymbol)

    return descriptor?.value ?? null
}

function getMetaObjectValue(obj: object, propName: string) {
    let descriptor: PropertyDescriptor = null
    let curObj = getMetaObjectValues(obj)

    while (curObj && !descriptor && Reflect.getPrototypeOf(curObj)) {
        descriptor = Reflect.getOwnPropertyDescriptor(curObj, propName)

        if (curObj && !descriptor) curObj = Reflect.getPrototypeOf(curObj)
    }

    let value = undefined
    let declaration = null

    if (descriptor) {
        if (descriptor.get) {
            value = descriptor.get.call(obj)
        } else {
            value = descriptor.value
        }

        if (MetaType.isMetaType(value)) {
            declaration = MetaType.getMetaImpl(value)

            if (declaration) value = declaration?.default
        }
    }

    const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false

    if (doSerialize) {
        if (!declaration) {
            const declarations = getMetaObjectDeclarations(obj)

            if (declarations && declarations[propName]) {
                declaration = declarations[propName]
            }
        }

        if (declaration) {
            return declaration.serialize(value, {
                place: 'get',
                propName,
                targetObject: obj
            })
        }
    }

    return value
}

function setMetaObjectValue(obj: object, propName: string, propValue: any) {
    if (propValue === undefined) {
        propValue = null
    }

    const doValidate = obj[MetaObjectValidationIsActiveSymbol] || false
    const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false

    const values = getMetaObjectValues(obj)

    let curObj = values
    let descriptor: PropertyDescriptor = null
    let declaration: MetaTypeImpl = null

    while (curObj && !descriptor && !declaration && Reflect.getPrototypeOf(curObj)) {
        if (!declaration) {
            const curObjDeclarations = getMetaObjectDeclarations(curObj)

            if (curObjDeclarations) declaration = curObjDeclarations[propName]
        }

        if (!descriptor) {
            descriptor = Reflect.getOwnPropertyDescriptor(curObj, propName)
        }

        if (!descriptor && !declaration) curObj = Reflect.getPrototypeOf(curObj)
    }

    if (descriptor && descriptor.set) {
        descriptor.set.call(obj, propValue)

        return true
    }

    if (!declaration) {
        const args = obj[MetaObjectTypesDefaultArgsSymbol] || {}

        if (descriptor && descriptor.value !== undefined) {
            declaration = MetaTypeImpl.getMetaTypeImpl(descriptor?.value, args)
        }

        if (!declaration) {
            declaration = MetaTypeImpl.getMetaTypeImpl(propValue, args)
        }
    }

    // if there is no MetaType for the value, the property will ignore Meta logic
    if (!declaration) {
        values[propName] = propValue

        return true
    }

    if (MetaType.isMetaType(propValue)) {
        propValue = MetaType.getMetaImpl(propValue)?.default ?? null
    }

    if (doSerialize) {
        propValue = declaration.deserialize(propValue, {
            place: 'set',
            propName,
            targetObject: obj
        })
    }

    if (doValidate) {
        declaration.validate(propValue, { propName, targetObject: obj })
    }

    try {
        values[propName] = propValue
    } catch (e) {
        if (
            e instanceof TypeError &&
            e.message.startsWith('Cannot assign to read only property')
        ) {
            e.message = `TypeError: Cannot assign to read only property '${propName}' of object '${obj}'`
        }

        throw e
    }

    const hasNotOwnDeclaration = curObj !== obj

    if (hasNotOwnDeclaration) {
        addDeclaration(obj, propName, declaration)
    }

    return true
}

function metaObjectToString(obj: object) {
    const name = obj[MetaObjectNameSymbol] || (Array.isArray(obj) ? 'array' : 'object')

    if (!isMetaObject(obj)) {
        const objOwnPropsStrings = Object.entries(obj)
            .sort(([key1], [key2]) => key1.localeCompare(key2))
            .map(([name, value]) => `${name} = ${inspectMetaValue(value)}`)

        return `[${name} extends Meta] { ${objOwnPropsStrings.join('; ')} }`
    }

    const metaObjectsInheritedDeclarationsStack = []

    let curObj = obj

    while (curObj && Reflect.getPrototypeOf(curObj)) {
        const descriptor = Reflect.getOwnPropertyDescriptor(curObj, MetaObjectDeclarationSymbol)

        if (descriptor && descriptor.value) {
            metaObjectsInheritedDeclarationsStack.push(descriptor.value)
        }

        curObj = Reflect.getPrototypeOf(curObj)
    }

    const declarations = {}

    metaObjectsInheritedDeclarationsStack.reverse().forEach((curDeclarations) => {
        Object.assign(declarations, curDeclarations)
    })

    const ownDeclarations = {}
    const inheritedDeclarations = {}

    const ownKeys = Object.keys(metaObjectsInheritedDeclarationsStack.pop() || {})
    const inheritedKeys = Object.keys(declarations).filter((key) => !ownKeys.includes(key))

    ownKeys.forEach((propName) => {
        ownDeclarations[propName] = declarations[propName]
    })

    inheritedKeys.forEach((propName) => {
        inheritedDeclarations[propName] = declarations[propName]
    })

    const objOwnDeclarationStrings = Object.entries(ownDeclarations)
        .sort(([key1], [key2]) => key1.localeCompare(key2))
        .map(([name, value]) => {
            return `${name}: ${value} = ${inspectMetaValue(obj[name])}`
        })

    const objInheritedDeclarationStrings = Object.entries(inheritedDeclarations).map(
        ([name, value]) => `[${name}]: ${value} = ${inspectMetaValue(obj[name])}`
    )

    return `[meta ${name}] { ${objOwnDeclarationStrings.join('; ')}${
        objOwnDeclarationStrings.length > 0 && objInheritedDeclarationStrings.length > 0
            ? '; '
            : ''
    }${objInheritedDeclarationStrings.join('; ')} }`
}

/**
 * Create Meta object
 *
 * @param base - the original object that is used as the parent object (also all properties will be copied)
 * @param metaArgs - {@link MetaArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta(
 *      { a: NUMBER() }
 * )
 *
 * obj1.a = 1
 *
 * const Cls1 = Meta(class {
 *      someClsInstanceProp = NUMBER()
 *      static someClsProp = STRING()
 * })
 *
 * Cls1.someClsProp = 'str'
 *
 * const Cls1Instance = new Cls1()
 *
 * Cls1Instance.someClsInstanceProp = 2
 * ```
 */
export function Meta<T extends object>(base?: T, metaArgs?: MetaArgs): T {
    if (!base) {
        base = {} as T
    }

    const propsIgnore = [
        ...(metaArgs?.propsIgnore || []),
        ...[
            'name',
            'length',
            'toString',
            'toLocaleString',
            'propertyIsEnumerable',
            'valueOf',
            'prototype',
            'apply',
            'call',
            'bind',
            'arguments',
            'caller',
            'constructor'
        ]
    ]

    let newObj: any

    if (base instanceof Function) {
        if (isClass(base)) {
            newObj = class MetaClass extends (base as any) {
                constructor(...args: any[]) {
                    super(...args)

                    if (IsMetaObjectSymbol in this) {
                        return this
                    }

                    const instance = Meta(this, metaArgs?.instanceArgs)

                    Object.defineProperty(instance, MetaObjectNameSymbol, {
                        value: `instance ${this.constructor.name}`,
                        configurable: true
                    })

                    return instance
                }
            }

            Object.defineProperty(newObj, MetaObjectNameSymbol, {
                get() {
                    return 'class ' + this['name']
                },
                configurable: true
            })
        } else {
            newObj = ((origFunc) => {
                function metaFunc(...args: any[]) {
                    if (this) {
                        let _this = origFunc.apply(this, ...args) || this || {}

                        if (!(_this instanceof Object)) {
                            _this = this as any
                        }

                        if (IsMetaObjectSymbol in _this) {
                            return _this
                        }

                        const instance = Meta(_this, metaArgs?.instanceArgs)

                        Object.defineProperty(instance, MetaObjectNameSymbol, {
                            value: `instance ${this.constructor.name}`,
                            configurable: true
                        })

                        return instance
                    } else {
                        return origFunc(...args)
                    }
                }

                // extend static props
                Object.setPrototypeOf(metaFunc, origFunc)

                // extend instance prototype
                metaFunc.prototype = Object.create(origFunc.prototype)
                metaFunc.prototype.constructor = metaFunc

                return metaFunc
            })(base)

            Object.defineProperty(newObj, MetaObjectNameSymbol, {
                get() {
                    return 'function ' + this['name']
                },
                configurable: true
            })
        }

        Object.defineProperty(newObj, 'name', {
            value: base['name'],
            configurable: true,
            writable: true
        })
    } else {
        if (Array.isArray(base)) {
            newObj = []

            if (metaArgs?.name) {
                Object.defineProperty(newObj, MetaObjectNameSymbol, {
                    value: `array ${metaArgs?.name}`,
                    configurable: true
                })
            }
        } else {
            newObj = {}

            if (metaArgs?.name) {
                Object.defineProperty(newObj, MetaObjectNameSymbol, {
                    value: `object ${metaArgs?.name}`,
                    configurable: true
                })
            }
        }
    }

    Object.defineProperty(newObj, IsMetaObjectSymbol, {
        value: true
    })

    Object.defineProperty(newObj, MetaObjectPropsIgnoreSymbol, {
        value: propsIgnore,
        writable: true
    })

    Object.defineProperty(newObj, MetaObjectDeclarationSymbol, {
        value: {}
    })

    Object.defineProperty(newObj, MetaObjectInitialDeclarationsSymbol, {
        value: base[MetaObjectInitialDeclarationsSymbol]
    })

    Object.defineProperty(newObj, MetaObjectValuesSymbol, {
        value: newObj
    })

    Object.defineProperty(newObj, MetaObjectValidationIsActiveSymbol, {
        value: !metaArgs?.disableValidation,
        writable: true
    })

    Object.defineProperty(newObj, MetaObjectSerializationIsActiveSymbol, {
        value: !metaArgs?.disableSerialization,
        writable: true
    })

    Object.defineProperty(newObj, MetaObjectTypesDefaultArgsSymbol, {
        value: metaArgs?.metaTypesDefaultArgs
    })

    Object.defineProperty(newObj, Symbol.for('nodejs.util.inspect.custom'), {
        value: function toString() {
            return metaObjectToString(this)
        },
        writable: true
    })

    initMetaObject(newObj, base)

    if (!metaArgs?.disableInheritance && base) Object.setPrototypeOf(newObj, base)

    return new Proxy(newObj, {
        get(target, propName, receiver) {
            if (
                propName === 'toString' ||
                propName === (Symbol.for('nodejs.util.inspect.custom') as any)
            ) {
                const value = Reflect.get(target, propName, receiver)

                // will replace default toString only
                if (Object.toString === value || Object.prototype.toString === value) {
                    return function toString() {
                        return metaObjectToString(receiver)
                    }
                }

                return value
            }

            if (
                typeof propName === 'symbol' ||
                propsIgnore.includes(propName) ||
                !isMetaObject(receiver)
            ) {
                return Reflect.get(target, propName, receiver)
            }

            return getMetaObjectValue(receiver, propName)
        },
        set(target, propName, propValue, receiver) {
            if (
                typeof propName === 'symbol' ||
                propsIgnore.includes(propName) ||
                !isMetaObject(receiver)
            ) {
                return Reflect.set(target, propName, propValue, receiver)
            }

            return setMetaObjectValue(receiver, propName, propValue)
        },
        defineProperty(target, propName, descriptor) {
            if (
                typeof propName === 'symbol' ||
                propsIgnore.includes(propName) ||
                !isMetaObject(target)
            ) {
                return Reflect.defineProperty(target, propName, descriptor)
            }

            const values = getMetaObjectValues(target)

            const result = Reflect.defineProperty(values, propName, descriptor)

            if (result && descriptor.value !== undefined) {
                addDeclaration(target, propName, descriptor.value, true)
            }

            return result
        },
        deleteProperty(target, propName) {
            if (
                typeof propName === 'symbol' ||
                propsIgnore.includes(propName) ||
                !isMetaObject(target)
            ) {
                return Reflect.deleteProperty(target, propName)
            }

            const declarations = getMetaObjectDeclarations(target)
            const values = getMetaObjectValues(target)

            Reflect.deleteProperty(declarations, propName)
            Reflect.deleteProperty(values, propName)

            return true
        },
        has(target, propName) {
            if (
                typeof propName === 'symbol' ||
                propsIgnore.includes(propName) ||
                !isMetaObject(target)
            ) {
                return Reflect.has(target, propName)
            }

            return (
                Reflect.has(newObj, propName) ||
                Reflect.has(getMetaObjectDeclarations(target), propName)
            )
        },
        ownKeys(target) {
            if (!isMetaObject(target)) {
                return Reflect.ownKeys(target)
            }

            const keys = Reflect.ownKeys(newObj)

            return [...new Set([...keys, ...Reflect.ownKeys(getMetaObjectDeclarations(target))])]
        },
        getOwnPropertyDescriptor(target, propName) {
            if (
                typeof propName === 'symbol' ||
                propsIgnore.includes(propName) ||
                !isMetaObject(target)
            ) {
                return Reflect.getOwnPropertyDescriptor(target, propName)
            }

            return (
                Reflect.getOwnPropertyDescriptor(newObj, propName) ||
                Reflect.getOwnPropertyDescriptor(getMetaObjectValues(target), propName)
            )
        }
    })
}

Meta.Class = (args?: MetaArgs) => {
    return <T extends new (...args: any[]) => any>(cls: T) => {
        return Meta(cls, args)
    }
}

Meta.isMetaObject = isMetaObject

Meta.validationIsActive = (obj: object) => {
    return obj[MetaObjectValidationIsActiveSymbol] ?? false
}

Meta.disableValidation = (obj: object) => {
    obj[MetaObjectValidationIsActiveSymbol] = false
}

Meta.enableValidation = (obj: object) => {
    obj[MetaObjectValidationIsActiveSymbol] = true
}

Meta.serializersIsActive = (obj: object) => {
    return obj[MetaObjectSerializationIsActiveSymbol] ?? false
}

Meta.disableSerializers = (obj: object) => {
    obj[MetaObjectSerializationIsActiveSymbol] = false
}

Meta.enableSerializers = (obj: object) => {
    obj[MetaObjectSerializationIsActiveSymbol] = true
}

Meta.validate = (obj: object, raw: object) => {
    const objDeclarations = getMetaObjectDeclarations(obj)

    Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, metaTypeImpl]) => {
        const value = raw[propName]

        metaTypeImpl.validate(value, { propName, targetObject: obj })
    })

    return true
}

Meta.serialize = (obj: object) => {
    const objDeclarations = getMetaObjectDeclarations(obj)
    const values = getMetaObjectValues(obj)

    const raw = {}

    Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, declaration]) => {
        const value = values[propName]

        raw[propName] = declaration.serialize(value, {
            place: 'serialize',
            propName,
            targetObject: obj
        })
    })

    return raw
}

Meta.deserialize = (obj: object, raw: object) => {
    if (!isMetaObject(obj)) {
        obj = Meta(obj)
    }

    const doValidate = obj[MetaObjectValidationIsActiveSymbol] || false
    const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false
    const objDeclarations = getMetaObjectDeclarations(obj)

    const _obj = {}

    Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, metaTypeImpl]) => {
        let value = raw[propName]

        if (value !== undefined) {
            if (doSerialize) {
                value = metaTypeImpl.deserialize(value, {
                    place: 'deserialize',
                    propName,
                    targetObject: obj
                })
            }

            if (doValidate) {
                metaTypeImpl.validate(value, { propName, targetObject: obj })
            }

            _obj[propName] = value
        }
    })

    const switchValidation = Meta.validationIsActive(obj)
    const switchSerialization = Meta.serializersIsActive(obj)

    if (switchValidation) Meta.disableValidation(obj)

    if (switchSerialization) Meta.disableSerializers(obj)

    for (const [propName, propValue] of Object.entries(_obj)) {
        obj[propName] = propValue
    }

    if (switchValidation) Meta.enableValidation(obj)

    if (switchSerialization) Meta.enableSerializers(obj)

    return obj
}

Meta.getJsonSchema = (obj: object, override?: Record<string, any>) => {
    const schemaProps = {}
    const objDeclarations = getMetaObjectDeclarations(obj)

    Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, declaration]) => {
        schemaProps[propName] = declaration.schema
    })

    return {
        $schema: 'http://json-schema.org/schema#',
        title: `meta ${obj[MetaObjectNameSymbol]}`,
        description: `Schema of meta object: ${obj[MetaObjectNameSymbol]}`,
        ...override,
        type: 'object',
        properties: schemaProps
    } as SchemaType
}

Meta.copy = <T extends object>(obj: T, args?: MetaArgs): T => {
    const newMeta = Meta(obj, { ...(args || {}), disableInheritance: true })

    if (!args?.disableInheritance) {
        Object.setPrototypeOf(newMeta, Object.getPrototypeOf(obj))
    }

    return newMeta
}

Meta.declare = Meta.d = (metaType: MetaTypeFlag) => {
    return (target: object, propName: string) => {
        const initialDeclarations = target[MetaObjectInitialDeclarationsSymbol] || {}

        initialDeclarations[propName] = MetaType.getMetaImpl(metaType)

        target[MetaObjectInitialDeclarationsSymbol] = initialDeclarations
    }
}

export const M = Meta

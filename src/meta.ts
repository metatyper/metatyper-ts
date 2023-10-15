import { AnyImpl, MetaType, MetaTypeImpl, SchemaType } from './metatypes'
import { isClass } from './utils/classes'

export const IsMetaObjectSymbol = Symbol('[[IsMetaObject]]')
export const IsMetaObjectChildSymbol = Symbol('[[IsMetaObjectChild]]')
export const MetaObjectNameSymbol = Symbol('[[MetaObjectName]]')
export const MetaObjectPropsIgnoreSymbol = Symbol('[[MetaObjectPropsIgnore]]')
export const MetaObjectValidationIsActiveSymbol = Symbol('[[MetaObjectValidationIsActive]]')
export const MetaObjectSerializationIsActiveSymbol = Symbol('[[MetaObjectSerializationIsActive]]')
export const MetaObjectDeclarationSymbol = Symbol('[[MetaObjectDeclaration]]')
export const MetaObjectValuesSymbol = Symbol('[[MetaObjectValues]]')
export const MetaObjectForPropsSymbol = Symbol('[[MetaObjectForProps]]')

/**
 * Meta args
 *
 * @param propsIgnore - enable default js logic for properties
 * @param disableValidation - disable all validators
 * @param disableSerialization - disable all serializers
 */
export type MetaArgs = {
    propsIgnore?: string[]
    disableValidation?: boolean
    disableSerialization?: boolean
}

export function initMetaObject(targetObject: object, origObj?: object) {
    if (!origObj) {
        origObj = targetObject
    }

    const doSerialize = targetObject[MetaObjectSerializationIsActiveSymbol] || false

    // obj is not a meta obj and not a child of a meta obj
    if (!targetObject[IsMetaObjectSymbol]) {
        return null
    }

    // obj is a child (origObj was initiated from a parent proxy setter)
    if (!Reflect.ownKeys(origObj).includes(IsMetaObjectSymbol)) {
        Reflect.defineProperty(targetObject, IsMetaObjectChildSymbol, {
            value: true,
            writable: false,
            configurable: false,
            enumerable: false
        })
    }

    const propsIgnore = targetObject[MetaObjectPropsIgnoreSymbol] || []
    const descriptors: Record<string, PropertyDescriptor> = {}
    let declarations: Record<string, MetaTypeImpl> = {}
    let values: Record<string, any> = {}

    if (Reflect.ownKeys(origObj).includes(MetaObjectDeclarationSymbol)) {
        declarations = origObj[MetaObjectDeclarationSymbol]
        values = origObj[MetaObjectValuesSymbol]
    }

    for (const propName of Reflect.ownKeys(origObj)) {
        if (typeof propName === 'string' && !propsIgnore?.includes(propName)) {
            const descriptor = Reflect.getOwnPropertyDescriptor(origObj, propName)

            if (descriptor.get || descriptor.set) {
                continue
            }

            descriptors[propName] = { ...descriptor }
        }
    }

    Object.entries(descriptors)
        .map(([propName, descriptor]) => {
            if (descriptor?.set || descriptor?.get) {
                return null
            }

            if (descriptor.value === undefined) return null

            let declaration: MetaTypeImpl = null

            if (MetaType.isMetaType(descriptor.value)) {
                declaration = MetaType.getMetaImpl(descriptor.value)
                descriptor.value = declaration?.default ?? null
            } else {
                declaration = MetaTypeImpl.getMetaTypeImpl(descriptor.value)
            }

            if (doSerialize) {
                if (doSerialize && declaration) {
                    descriptor.value = declaration.deserialize(descriptor.value, {
                        place: 'init',
                        propName,
                        targetObject
                    })
                }
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

    Reflect.defineProperty(targetObject, MetaObjectDeclarationSymbol, {
        value: declarations
    })

    Reflect.defineProperty(targetObject, MetaObjectValuesSymbol, {
        value: values
    })

    return { declarations, values }
}

export function addDeclaration(obj: object, propName: string, propValue: any, rewrite = false) {
    const descriptor = Reflect.getOwnPropertyDescriptor(obj, MetaObjectDeclarationSymbol)

    let declarations = descriptor?.value

    if (!declarations) {
        declarations = initMetaObject(obj)?.declarations
    }

    if (!declarations) {
        return null
    }

    if (!declarations[propName] || rewrite) {
        const declaration = MetaTypeImpl.getMetaTypeImpl(propValue) || AnyImpl.build()

        declarations[propName] = declaration
    }

    return declarations[propName]
}

export function getMetaObjectOwnDeclarations(obj: object) {
    const descriptor = Reflect.getOwnPropertyDescriptor(obj, MetaObjectDeclarationSymbol)

    return descriptor?.value || {}
}

export function getMetaObjectDeclarations(obj: object) {
    if (!obj) {
        return null
    }

    const metaObjectsInheritedDeclarationsStack = []

    while (obj && Reflect.getPrototypeOf(obj)) {
        const descriptor = Reflect.getOwnPropertyDescriptor(obj, MetaObjectDeclarationSymbol)

        if (descriptor && descriptor.value)
            metaObjectsInheritedDeclarationsStack.push(descriptor.value)

        obj = Reflect.getPrototypeOf(obj)
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

    return {
        own: ownDeclarations,
        inherited: inheritedDeclarations
    }
}

export function getMetaObjectValues(obj: object) {
    if (!obj) {
        return null
    }

    let values = null
    const valuesDescriptor = Reflect.getOwnPropertyDescriptor(obj, MetaObjectValuesSymbol)

    if (valuesDescriptor) {
        values = valuesDescriptor.value ?? null
    }

    if (!values) {
        values = initMetaObject(obj)?.values || null
    }

    return values
}

export function getMetaObjectValue(obj: object, propName: string) {
    let value = undefined
    let declaration: MetaTypeImpl = undefined
    let curObj = obj

    const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false

    while (curObj && value === undefined && Reflect.getPrototypeOf(curObj)) {
        const declarations = getMetaObjectOwnDeclarations(curObj)
        const values = getMetaObjectValues(curObj)

        declaration = declarations[propName]
        value = values ? values[propName] : undefined

        if (value === undefined) {
            if (declaration) {
                value = declaration?.default

                curObj = null
            } else {
                const descriptor = Reflect.getOwnPropertyDescriptor(curObj, propName)

                if (descriptor) {
                    if (descriptor.get) {
                        value = descriptor.get.call(obj)
                    } else if (descriptor.value !== undefined) {
                        value = descriptor.value
                    }

                    if (MetaType.isMetaType(value)) {
                        declaration = MetaType.getMetaImpl(value)

                        value = declaration?.default
                    }
                }
            }
        }

        if (curObj) curObj = Reflect.getPrototypeOf(curObj)
    }

    if (doSerialize && declaration) {
        value = declaration.serialize(value, {
            place: 'get',
            propName,
            targetObject: obj
        })
    }

    return value
}

export function setMetaObjectValue(obj: object, propName: string, propValue: any) {
    if (propValue === undefined) {
        propValue = null
    }

    const doValidate = obj[MetaObjectValidationIsActiveSymbol] || false
    const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false

    const values = getMetaObjectValues(obj)

    if (!values) {
        return false
    }

    let curObj = obj
    let descriptor: PropertyDescriptor

    while (curObj && !descriptor && Reflect.getPrototypeOf(curObj)) {
        const curObjValues = getMetaObjectValues(curObj)

        if (curObjValues) {
            descriptor = Object.getOwnPropertyDescriptor(curObjValues, propName)
        }

        if (!descriptor) {
            descriptor = Object.getOwnPropertyDescriptor(curObj, propName)
        }

        if (!descriptor) {
            curObj = Reflect.getPrototypeOf(curObj)
        }
    }

    if (descriptor && descriptor.set) {
        descriptor.set.call(obj, propValue)

        return true
    }

    curObj = obj
    let declaration: MetaTypeImpl

    while (curObj && !declaration && Reflect.getPrototypeOf(curObj)) {
        const curObjDeclarations = getMetaObjectOwnDeclarations(curObj)

        declaration = curObjDeclarations[propName]

        if (!declaration) curObj = Reflect.getPrototypeOf(curObj)
    }

    const hasNotOwnDeclaration = curObj !== obj && declaration

    let metaTypeImpl: MetaTypeImpl

    if (doValidate || doSerialize || !declaration) {
        metaTypeImpl =
            declaration ||
            MetaTypeImpl.getMetaTypeImpl(descriptor?.value ?? propValue ?? null) ||
            AnyImpl.build()
    }

    if (MetaType.isMetaType(propValue)) {
        propValue = MetaType.getMetaImpl(propValue)?.default ?? null
    }

    if (doSerialize) {
        propValue = metaTypeImpl.deserialize(propValue, {
            place: 'set',
            propName,
            targetObject: obj
        })
    }

    if (doValidate) {
        metaTypeImpl.validate(propValue, { propName, targetObject: obj })
    }

    if (descriptor && !Reflect.getOwnPropertyDescriptor(values, propName))
        Object.defineProperty(values, propName, { ...descriptor, value: undefined })

    values[propName] = propValue

    // This obj don't has own declaration (there is parent declaration or none)
    if (hasNotOwnDeclaration) {
        addDeclaration(obj, propName, declaration)
    }

    if (!declaration) {
        addDeclaration(obj, propName, metaTypeImpl)
    }

    return true
}

function metaObjectToString(obj: object) {
    const name = obj[MetaObjectNameSymbol] || 'object'
    const declarations = getMetaObjectDeclarations(obj)

    const objOwnDeclarationStrings = Object.entries(declarations.own)
        .sort(([key1], [key2]) => key1.localeCompare(key2))
        .map(([name, value]) => `${name}: ${value} = ${obj[name]}`)

    const objInheritedDeclarationStrings = Object.entries(declarations.inherited).map(
        ([name, value]) => `[${name}]: ${value} = ${obj[name]}`
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
 * @param args - {@link MetaArgs}
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
export function Meta<T extends object>(base?: T, args?: MetaArgs): T {
    if (!base) {
        base = {} as T
    }

    const propsIgnore = [...(args?.propsIgnore || [])]

    propsIgnore.push(
        ...[
            'name',
            'length',
            'toString',
            'prototype',
            'apply',
            'call',
            'bind',
            'arguments',
            'caller',
            'constructor'
        ]
    )

    let newObj: any

    if (base instanceof Function) {
        if (isClass(base)) {
            newObj = class MetaClass extends (base as any) {
                constructor(...args: any[]) {
                    super(...args)

                    if (exports.IsMetaObjectSymbol in this) {
                        return this
                    }

                    const instance = Meta(this) // TODO: add args

                    Object.defineProperty(instance, MetaObjectNameSymbol, {
                        value: `instance ${this.constructor.name}`,
                        configurable: true
                    })

                    return instance
                }
            }
        } else {
            newObj = ((origFunc) => {
                function metaFunc(...args: any[]) {
                    if (this) {
                        const _this = origFunc.apply(this, ...args) || this || {}

                        if (exports.IsMetaObjectSymbol in _this) {
                            return _this
                        }

                        const instance = Meta(_this)

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
        }

        Object.defineProperty(newObj, 'name', {
            value: base['name'],
            configurable: true,
            writable: true
        })

        Object.defineProperty(newObj, MetaObjectNameSymbol, {
            get() {
                return this['name']
            },
            configurable: true
        })
    } else {
        newObj = {}
    }

    Object.defineProperty(newObj, IsMetaObjectSymbol, {
        value: true
    })

    Object.defineProperty(newObj, MetaObjectPropsIgnoreSymbol, {
        value: propsIgnore,
        writable: true
    })

    Object.defineProperty(newObj, MetaObjectValidationIsActiveSymbol, {
        value: !args?.disableValidation,
        writable: true
    })

    Object.defineProperty(newObj, MetaObjectSerializationIsActiveSymbol, {
        value: !args?.disableSerialization,
        writable: true
    })

    function toString() {
        return metaObjectToString(this)
    }

    Reflect.defineProperty(newObj, Symbol.for('nodejs.util.inspect.custom'), {
        value: toString,
        writable: true
    })

    initMetaObject(newObj, base)

    if (base) Object.setPrototypeOf(newObj, base)

    return new Proxy(newObj, {
        get(target, propName, receiver) {
            if (propName === 'toString') {
                const value = Reflect.get(target, propName, receiver)

                // will replace default toString
                if (Object.toString === value || Object.prototype.toString === value) {
                    return toString.bind(receiver)
                }

                return value
            }

            if (typeof propName === 'symbol' || propsIgnore.includes(propName)) {
                return Reflect.get(target, propName, receiver)
            }

            return getMetaObjectValue(receiver, propName)
        },
        set(target, propName, propValue, receiver) {
            if (typeof propName === 'symbol' || propsIgnore.includes(propName)) {
                return Reflect.set(target, propName, propValue, receiver)
            }

            return setMetaObjectValue(receiver, propName, propValue)
        },
        defineProperty(target, propName, descriptor) {
            if (typeof propName === 'symbol' || propsIgnore.includes(propName)) {
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
            if (typeof propName === 'symbol' || propsIgnore.includes(propName)) {
                return Reflect.deleteProperty(target, propName)
            }

            const declarations = getMetaObjectOwnDeclarations(target)
            const values = getMetaObjectValues(target)

            Reflect.deleteProperty(declarations, propName)
            Reflect.deleteProperty(values, propName)

            return true
        }
    })
}

Meta.Class = (args?: MetaArgs) => {
    return <T extends new (...args: any[]) => any>(cls: T) => {
        return Meta(cls, args)
    }
}

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
    const objDeclarations = getMetaObjectOwnDeclarations(obj)

    Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, metaTypeImpl]) => {
        const value = raw[propName]

        metaTypeImpl.validate(value, { propName, targetObject: obj })
    })

    return true
}

Meta.serialize = (obj: object) => {
    const objDeclarations = getMetaObjectOwnDeclarations(obj)
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
    const doValidate = obj[MetaObjectValidationIsActiveSymbol] || false
    const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false
    const objDeclarations = getMetaObjectOwnDeclarations(obj)

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
    const objDeclarations = getMetaObjectOwnDeclarations(obj)

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

const origKeys = Object['keys']
const origValues = Object['values']
const origEntries = Object['entries']
const origGetOwnPropertyNames = Object['getOwnPropertyNames']
const origJSONStringify = JSON['stringify']

let _patched = false

Meta.restoreBuiltins = function restoreBuiltins() {
    if (_patched) {
        Object['keys'] = origKeys
        Object['values'] = origValues
        Object['entries'] = origEntries
        Object['getOwnPropertyNames'] = origGetOwnPropertyNames
        JSON['stringify'] = origJSONStringify

        _patched = false
    }
}

Meta.patchBuiltins = function patchBuiltins() {
    if (_patched) return

    _patched = true

    Object['keys'] = function keys(o: object): string[] {
        const metaValues = o[MetaObjectValuesSymbol]

        if (metaValues) {
            return origKeys(metaValues)
        } else {
            return origKeys(o)
        }
    }

    Object['values'] = function values(o: object): any[] {
        const metaValues = o[MetaObjectValuesSymbol]

        if (metaValues) {
            return origValues(metaValues)
        } else {
            return origValues(o)
        }
    }

    Object['entries'] = function entries(o: object): [string, any][] {
        const metaValues = o[MetaObjectValuesSymbol]

        if (metaValues) {
            return origEntries(metaValues)
        } else {
            return origEntries(o)
        }
    }

    Object['getOwnPropertyNames'] = function getOwnPropertyNames(o: object): string[] {
        const metaValues = o[MetaObjectValuesSymbol]

        if (metaValues) {
            return [
                ...new Set([...origGetOwnPropertyNames(o), ...origGetOwnPropertyNames(metaValues)])
            ]
        } else {
            return origGetOwnPropertyNames(o)
        }
    }

    JSON['stringify'] = function stringify(value: any, ...args: any[]): string {
        const metaValues = value[MetaObjectValuesSymbol]

        if (metaValues) {
            return origJSONStringify(metaValues, ...args)
        } else {
            return origJSONStringify(value, ...args)
        }
    }
}

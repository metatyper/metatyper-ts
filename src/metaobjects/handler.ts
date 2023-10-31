import {
    IsMetaObjectSymbol,
    MetaObjectNameSymbol,
    MetaObjectIgnoredPropsSymbol,
    MetaObjectValidationIsActiveSymbol,
    MetaObjectSerializationIsActiveSymbol,
    MetaObjectDeclarationSymbol,
    MetaObjectValuesSymbol,
    MetaObjectTypesDefaultArgsSymbol
} from './symbols'
import { MetaArgs } from './metaArgs'

import { MetaType, MetaTypeImpl, SchemaType } from '../metatypes'

import { inspectMetaValue, isClass, getDescriptorValue } from '../utils'

export class MetaLogicHandler {
    protected _builtinIgnoredProps = [
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

    get builtinIgnoredProps(): (string | symbol)[] {
        return [...this._builtinIgnoredProps]
    }

    protected getIgnoredProps(targetObj: any) {
        const ignoredProps = getDescriptorValue(targetObj, MetaObjectIgnoredPropsSymbol) || []
        const builtinIgnoredProps = this.builtinIgnoredProps

        return [...builtinIgnoredProps, ...ignoredProps]
    }

    initProp(
        targetObject: object,
        propName: string | symbol,
        descriptor: PropertyDescriptor,
        declarations: Record<string, MetaTypeImpl>,
        values: Record<string, any>
    ) {
        if (descriptor.get || descriptor.set || typeof propName === 'symbol') {
            Reflect.deleteProperty(values, propName)
            Reflect.defineProperty(values, propName, descriptor)

            return null
        }

        if (descriptor.value === undefined) return null

        const defaultMetaTypeArgs = getDescriptorValue(
            targetObject,
            MetaObjectTypesDefaultArgsSymbol
        )

        let declaration: MetaTypeImpl = declarations[propName]

        if (!declaration) {
            if (descriptor.value instanceof MetaTypeImpl) {
                if (defaultMetaTypeArgs) {
                    declaration = descriptor.value.rebuild(defaultMetaTypeArgs)
                }

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
        }

        const doSerialize = getDescriptorValue(targetObject, MetaObjectSerializationIsActiveSymbol)

        if (doSerialize && declaration) {
            descriptor.value = declaration.deserialize(descriptor.value, {
                place: 'init',
                propName,
                targetObject
            })
        }

        if (declaration) {
            declarations[propName] = declaration
        }

        Reflect.deleteProperty(values, propName)
        Reflect.defineProperty(values, propName, descriptor)
    }

    defineMetaProps(newObj: any, baseObj: any, metaArgs: MetaArgs) {
        const instance = this

        Object.defineProperty(newObj, Symbol.for('nodejs.util.inspect.custom'), {
            value: function toString() {
                return instance.represent(this)
            },
            writable: true
        })

        if (isClass(baseObj)) {
            Object.defineProperty(newObj, MetaObjectNameSymbol, {
                value: `class ${metaArgs?.name || baseObj.name}`
            })
        } else if (baseObj instanceof Function) {
            Object.defineProperty(newObj, MetaObjectNameSymbol, {
                value: `function ${metaArgs?.name || baseObj.name}`
            })
        } else if (newObj.constructor[IsMetaObjectSymbol]) {
            Object.defineProperty(newObj, MetaObjectNameSymbol, {
                value: `instance ${
                    metaArgs?.instanceArgs?.name ||
                    newObj.constructor.name ||
                    newObj.constructor[MetaObjectNameSymbol]
                }`,
                configurable: true
            })
        } else {
            const nameStr = metaArgs?.name ? ' ' + metaArgs?.name : ''

            if (Array.isArray(baseObj)) {
                Object.defineProperty(newObj, MetaObjectNameSymbol, {
                    value: `array${nameStr}`
                })
            } else {
                Object.defineProperty(newObj, MetaObjectNameSymbol, {
                    value: `object${nameStr}`
                })
            }
        }
    }

    represent(metaObj: any) {
        const name = metaObj[MetaObjectNameSymbol] || (Array.isArray(metaObj) ? 'array' : 'object')

        if (!getDescriptorValue(metaObj, IsMetaObjectSymbol)) {
            const objOwnPropsStrings = Object.entries(metaObj)
                .sort(([key1], [key2]) => key1.localeCompare(key2))
                .map(([name, value]) => `${name} = ${inspectMetaValue(value)}`)

            return `[${name} extends Meta] { ${objOwnPropsStrings.join('; ')} }`
        }

        const metaObjectsInheritedDeclarationsStack = []

        let curObj = metaObj

        while (curObj && Reflect.getPrototypeOf(curObj)) {
            const descriptor = Reflect.getOwnPropertyDescriptor(
                curObj,
                MetaObjectDeclarationSymbol
            )

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
                return `${name}: ${value} = ${inspectMetaValue(metaObj[name])}`
            })

        const objInheritedDeclarationStrings = Object.entries(inheritedDeclarations).map(
            ([name, value]) => `[${name}]: ${value} = ${inspectMetaValue(metaObj[name])}`
        )

        return `[meta ${name}] { ${objOwnDeclarationStrings.join('; ')}${
            objOwnDeclarationStrings.length > 0 && objInheritedDeclarationStrings.length > 0
                ? '; '
                : ''
        }${objInheritedDeclarationStrings.join('; ')} }`
    }

    proxyGetValue(proxySource: any, propName: string | symbol, targetObj: any) {
        if (propName === 'toString' || propName === Symbol.for('nodejs.util.inspect.custom')) {
            const handlerInstance = this
            const value = Reflect.get(proxySource, propName, targetObj)

            // will replace default toString only
            if (Object.toString === value || Object.prototype.toString === value) {
                return function toString() {
                    return handlerInstance.represent(targetObj)
                }
            }

            return value
        }

        if (
            typeof propName === 'symbol' ||
            !getDescriptorValue(targetObj, IsMetaObjectSymbol) ||
            this.getIgnoredProps(targetObj).includes(propName)
        ) {
            return Reflect.get(proxySource, propName, targetObj)
        }

        let descriptor: PropertyDescriptor = null
        let curValues = getDescriptorValue(targetObj, MetaObjectValuesSymbol)

        // try to find a descriptor in the prototype chain
        while (curValues && !descriptor && Reflect.getPrototypeOf(curValues)) {
            descriptor = Reflect.getOwnPropertyDescriptor(curValues, propName)

            if (curValues && !descriptor) curValues = Reflect.getPrototypeOf(curValues)
        }

        let value = undefined
        let declaration = null

        if (descriptor) {
            if (descriptor.get) {
                return descriptor.get.call(targetObj)
            } else {
                value = descriptor.value
            }

            /* 
            used if we are trying to get the value of a property of a parent meta object
    
            const parentObj = {
                a: NUMBER({ default: 1 })
            }
            const myObj = Object.create(parentObj)
            const myMetaObj = Meta(myObj)

            myObj['a'] === 1 // false
            myMetaObj['a'] === 1 // true
            */
            if (MetaType.isMetaType(value)) {
                declaration = MetaType.getMetaImpl(value)
                value = declaration?.default
            }
        }

        const doSerialize = getDescriptorValue(targetObj, MetaObjectSerializationIsActiveSymbol)

        if (doSerialize) {
            if (!declaration) {
                const declarations = getDescriptorValue(targetObj, MetaObjectDeclarationSymbol)

                if (declarations && declarations[propName]) {
                    declaration = declarations[propName]
                }
            }

            if (declaration) {
                return declaration.serialize(value, {
                    place: 'get',
                    propName,
                    targetObject: targetObj
                })
            }
        }

        return value
    }

    proxySetValue(proxySource: any, propName: string | symbol, propValue: any, targetObj: any) {
        if (
            typeof propName === 'symbol' ||
            !getDescriptorValue(targetObj, IsMetaObjectSymbol) ||
            this.getIgnoredProps(targetObj).includes(propName)
        ) {
            return Reflect.set(proxySource, propName, propValue, targetObj)
        }

        if (propValue === undefined) {
            propValue = null
        }

        const doValidate = getDescriptorValue(targetObj, MetaObjectValidationIsActiveSymbol)
        const doSerialize = getDescriptorValue(targetObj, MetaObjectSerializationIsActiveSymbol)

        const values = getDescriptorValue(targetObj, MetaObjectValuesSymbol)

        let curValues = values
        let descriptor: PropertyDescriptor = null
        let declaration: MetaTypeImpl = null

        // trying to find a declaration or/and a descriptor in a prototype chain
        while (curValues && !descriptor && !declaration && Reflect.getPrototypeOf(curValues)) {
            if (!declaration) {
                const curObjDeclarations = getDescriptorValue(
                    curValues,
                    MetaObjectDeclarationSymbol
                )

                if (curObjDeclarations && curObjDeclarations[propName])
                    declaration = curObjDeclarations[propName]
            }

            if (!descriptor) {
                descriptor = Reflect.getOwnPropertyDescriptor(curValues, propName)
            }

            if (!descriptor && !declaration) curValues = Reflect.getPrototypeOf(curValues)
        }

        if (descriptor && descriptor.set) {
            descriptor.set.call(targetObj, propValue)

            return true
        }

        if (!declaration) {
            const args = getDescriptorValue(targetObj, MetaObjectTypesDefaultArgsSymbol) || null

            if (descriptor && descriptor.value !== undefined) {
                declaration = MetaTypeImpl.getMetaTypeImpl(descriptor?.value, args)
            }
        }

        const hasNotOwnDeclaration = curValues !== values

        // add a new declaration to the targetObj
        if (hasNotOwnDeclaration || !declaration) {
            const declarations = getDescriptorValue(targetObj, MetaObjectDeclarationSymbol)
            const args = targetObj[MetaObjectTypesDefaultArgsSymbol] || {}

            declaration = MetaTypeImpl.getMetaTypeImpl(propValue, args)

            if (declaration) declarations[propName] = declaration
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
                targetObject: targetObj
            })
        }

        if (doValidate) {
            declaration.validate(propValue, { propName, targetObject: targetObj })
        }

        try {
            values[propName] = propValue
        } catch (e) {
            if (
                e instanceof TypeError &&
                e.message.startsWith('Cannot assign to read only property')
            ) {
                e.message = `TypeError: Cannot assign to read only property '${propName}' of object '${targetObj}'`
            }

            throw e
        }

        return true
    }

    proxyDefineProperty(
        targetObj: any,
        propName: string | symbol,
        descriptor: PropertyDescriptor
    ) {
        if (
            typeof propName === 'symbol' ||
            !getDescriptorValue(targetObj, IsMetaObjectSymbol) ||
            this.getIgnoredProps(targetObj).includes(propName)
        ) {
            return Reflect.defineProperty(targetObj, propName, descriptor)
        }

        const values = getDescriptorValue(targetObj, MetaObjectValuesSymbol)
        const result = Reflect.defineProperty(values, propName, descriptor)

        if (result && descriptor.value !== undefined) {
            const declarations = getDescriptorValue(targetObj, MetaObjectDeclarationSymbol)
            const args = targetObj[MetaObjectTypesDefaultArgsSymbol] || {}

            const declaration = MetaTypeImpl.getMetaTypeImpl(descriptor.value, args)

            if (declaration) declarations[propName] = declaration
        }

        return result
    }

    proxyDeleteProperty(targetObj: any, propName: string | symbol) {
        if (
            typeof propName === 'symbol' ||
            !getDescriptorValue(targetObj, IsMetaObjectSymbol) ||
            this.getIgnoredProps(targetObj).includes(propName)
        ) {
            return Reflect.deleteProperty(targetObj, propName)
        }

        const declarations = getDescriptorValue(targetObj, MetaObjectDeclarationSymbol)
        const values = getDescriptorValue(targetObj, MetaObjectValuesSymbol)

        return (
            Reflect.deleteProperty(declarations, propName) &&
            Reflect.deleteProperty(values, propName)
        )
    }

    proxyHas(targetObj: any, propName: string | symbol) {
        if (
            typeof propName === 'symbol' ||
            !getDescriptorValue(targetObj, IsMetaObjectSymbol) ||
            this.getIgnoredProps(targetObj).includes(propName)
        ) {
            return Reflect.has(targetObj, propName)
        }

        const values = getDescriptorValue(targetObj, MetaObjectValuesSymbol)

        return Reflect.has(values, propName)
    }

    proxyOwnKeys(targetObj: any) {
        if (!getDescriptorValue(targetObj, IsMetaObjectSymbol)) {
            return Reflect.ownKeys(targetObj)
        }

        const values = getDescriptorValue(targetObj, MetaObjectValuesSymbol)

        return Reflect.ownKeys(values)
    }

    proxyGetOwnPropertyDescriptor(targetObj: any, propName: string | symbol) {
        if (
            typeof propName === 'symbol' ||
            !getDescriptorValue(targetObj, IsMetaObjectSymbol) ||
            this.getIgnoredProps(targetObj).includes(propName)
        ) {
            return Reflect.getOwnPropertyDescriptor(targetObj, propName)
        }

        const values = getDescriptorValue(targetObj, MetaObjectValuesSymbol)

        return Reflect.getOwnPropertyDescriptor(values, propName)
    }

    validate(obj: object, raw: object) {
        const objDeclarations = getDescriptorValue(obj, MetaObjectDeclarationSymbol)

        Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, metaTypeImpl]) => {
            const value = raw[propName]

            metaTypeImpl.validate(value, { propName, targetObject: obj })
        })

        return true
    }

    serialize(obj: object) {
        const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false
        const objDeclarations = getDescriptorValue(obj, MetaObjectDeclarationSymbol)
        const values = getDescriptorValue(obj, MetaObjectValuesSymbol)

        const raw = {}

        Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, declaration]) => {
            const value = values[propName]

            if (doSerialize) {
                raw[propName] = declaration.serialize(value, {
                    place: 'serialize',
                    propName,
                    targetObject: obj
                })
            } else {
                raw[propName] = value
            }
        })

        return raw
    }

    deserialize(obj: object, raw: object) {
        const doValidate = obj[MetaObjectValidationIsActiveSymbol] || false
        const doSerialize = obj[MetaObjectSerializationIsActiveSymbol] || false
        const objDeclarations = getDescriptorValue(obj, MetaObjectDeclarationSymbol)
        const values = getDescriptorValue(obj, MetaObjectValuesSymbol)

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

                values[propName] = value
            }
        })

        return obj
    }

    getJsonSchema(obj: object, override?: Record<string, any>) {
        const schemaProps = {}
        const objDeclarations = getDescriptorValue(obj, MetaObjectDeclarationSymbol)

        Object.entries<MetaTypeImpl>(objDeclarations).forEach(([propName, declaration]) => {
            const schema = declaration.getJsonSchema()

            if (schema) schemaProps[propName] = schema
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
}

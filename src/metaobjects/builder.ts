import {
    IsMetaObjectSymbol,
    MetaObjectIgnoredPropsSymbol,
    MetaObjectValidationIsActiveSymbol,
    MetaObjectSerializationIsActiveSymbol,
    MetaObjectInitialDeclarationsSymbol,
    MetaObjectDeclarationSymbol,
    MetaObjectValuesSymbol,
    MetaObjectTypesDefaultArgsSymbol,
    MetaObjectBuilderSymbol,
    MetaObjectTypeSymbol
} from './symbols'
import { MetaArgs } from './metaArgs'
import { MetaLogicHandler } from './handler'

import { isClass, getDescriptorValue } from '../utils'

export class MetaObjectBuilder {
    private static _instance = new MetaObjectBuilder()

    static get instance() {
        return this._instance
    }

    static setDefaultBuilderInstance(builder: MetaObjectBuilder) {
        this._instance = builder
    }

    constructor(public handler = new MetaLogicHandler()) {}

    build<T extends object>(base: T, metaArgs?: MetaArgs): T {
        const newObj = this.createNewObj(base, metaArgs)

        return this.createProxy(newObj)
    }

    protected createNewObj(base: any, metaArgs?: MetaArgs) {
        let newObj = null

        if (base instanceof Function) {
            if (isClass(base)) {
                newObj = this.createMetaClass(base, metaArgs)
            } else {
                newObj = this.createMetaFunction(base, metaArgs)
            }
        } else {
            newObj = this.createMetaObject(base, metaArgs)
        }

        this.defineMetaProps(newObj, base, metaArgs)
        this.initMetaValues(newObj, base)

        return newObj
    }

    protected createProxy(newObj: any) {
        return new Proxy(newObj, {
            get: this.handler.proxyGetValue.bind(this.handler),
            set: this.handler.proxySetValue.bind(this.handler),
            defineProperty: this.handler.proxyDefineProperty.bind(this.handler),
            deleteProperty: this.handler.proxyDeleteProperty.bind(this.handler),
            has: this.handler.proxyHas.bind(this.handler),
            ownKeys: this.handler.proxyOwnKeys.bind(this.handler),
            getOwnPropertyDescriptor: this.handler.proxyGetOwnPropertyDescriptor.bind(this.handler)
        })
    }

    protected createMetaClass(BaseCls: any, metaArgs?: MetaArgs) {
        const builderInstance = this

        const newCls = class MetaClass extends BaseCls {
            constructor(...args: any[]) {
                super(...args)

                if (IsMetaObjectSymbol in this) {
                    return this
                }

                return builderInstance.build(this, metaArgs?.instanceArgs)
            }
        }

        Object.defineProperty(newCls, 'name', {
            value: BaseCls.name,
            writable: true,
            configurable: true
        })

        Object.defineProperty(newCls, MetaObjectTypeSymbol, {
            value: 'class'
        })

        return newCls
    }

    protected createMetaFunction(baseFunc: any, metaArgs?: MetaArgs) {
        const builderInstance = this

        function metaFunc(...args: any[]) {
            if (this) {
                let _this = baseFunc.apply(this, ...args) || this || {}

                if (!(_this instanceof Object)) {
                    _this = this as any
                }

                if (IsMetaObjectSymbol in _this) {
                    return _this
                }

                return builderInstance.build(_this, metaArgs?.instanceArgs)
            } else {
                return baseFunc(...args)
            }
        }

        // extend static props
        Object.setPrototypeOf(metaFunc, baseFunc)

        // extend instance prototype
        metaFunc.prototype = Object.create(baseFunc.prototype)
        metaFunc.prototype.constructor = metaFunc

        Object.defineProperty(metaFunc, 'name', {
            value: baseFunc.name,
            writable: true,
            configurable: true
        })

        Object.defineProperty(metaFunc, MetaObjectTypeSymbol, {
            value: 'function'
        })

        return metaFunc
    }

    protected createMetaObject(baseObj: any, metaArgs?: MetaArgs) {
        let newObj = null

        if (Array.isArray(baseObj)) {
            newObj = []

            Object.defineProperty(newObj, MetaObjectTypeSymbol, {
                value: 'array'
            })
        } else {
            newObj = {}

            Object.defineProperty(newObj, MetaObjectTypeSymbol, {
                value: 'object'
            })
        }

        if (!metaArgs?.disableInheritance && baseObj) Object.setPrototypeOf(newObj, baseObj)

        return newObj
    }

    protected defineMetaProps(newObj: any, baseObj: any, metaArgs: MetaArgs) {
        Object.defineProperty(newObj, IsMetaObjectSymbol, {
            value: true
        })

        Object.defineProperty(newObj, MetaObjectBuilderSymbol, {
            value: this
        })

        Object.defineProperty(newObj, MetaObjectIgnoredPropsSymbol, {
            value: metaArgs?.ignoredProps ? [...metaArgs.ignoredProps] : []
        })

        Object.defineProperty(newObj, MetaObjectDeclarationSymbol, {
            value: {}
        })

        Object.defineProperty(newObj, MetaObjectInitialDeclarationsSymbol, {
            value: baseObj[MetaObjectInitialDeclarationsSymbol],
            writable: true
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

        this.handler.defineMetaProps(newObj, baseObj, metaArgs)
    }

    protected initMetaValues(targetObject: object, origObj: object) {
        if (!origObj) {
            origObj = targetObject
        }

        // obj is not a meta obj
        if (!getDescriptorValue(targetObject, IsMetaObjectSymbol)) {
            return null
        }

        const values = getDescriptorValue(targetObject, MetaObjectValuesSymbol)
        const declarations = getDescriptorValue(targetObject, MetaObjectDeclarationSymbol)

        const ignoredProps = targetObject[MetaObjectIgnoredPropsSymbol] || []
        const builtinIgnoredProps = this.handler.builtinIgnoredProps

        const initialDeclarations = origObj[MetaObjectInitialDeclarationsSymbol]

        if (initialDeclarations) {
            for (const [propName, metaTypeImpl] of Object.entries<any>(initialDeclarations)) {
                if (!builtinIgnoredProps.includes(propName) && !ignoredProps.includes(propName)) {
                    declarations[propName] = metaTypeImpl

                    this.handler.initProp(
                        targetObject,
                        propName,
                        {
                            value: metaTypeImpl.default,
                            writable: true,
                            configurable: true
                        },
                        declarations,
                        values
                    )
                }
            }
        }

        for (const propName of Reflect.ownKeys(origObj)) {
            const descriptor = Reflect.getOwnPropertyDescriptor(origObj, propName)

            if (!builtinIgnoredProps.includes(propName)) {
                if (!ignoredProps.includes(propName)) {
                    this.handler.initProp(
                        targetObject,
                        propName,
                        { ...descriptor },
                        declarations,
                        values
                    )
                } else {
                    Reflect.deleteProperty(values, propName)
                    Reflect.defineProperty(values, propName, descriptor)
                }
            }
        }
    }
}

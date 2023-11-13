import {
    IsMetaObjectSymbol,
    MetaObjectValidationIsActiveSymbol,
    MetaObjectSerializationIsActiveSymbol,
    MetaObjectInitialDeclarationsSymbol,
    MetaObjectBuilderSymbol
} from './symbols'

import { MetaObjectBuilder } from './builder'
import { MetaArgs } from './metaArgs'

import { MetaType, MetaTypeArgs, MetaTypeFlag, MetaTypeImpl } from '../metatypes'
import { getDescriptorValue } from '../utils'
import { MetaLogicHandler } from './handler'

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

    return MetaObjectBuilder.instance.build(base, metaArgs)
}

Meta.Class = (args?: MetaArgs) => {
    return <T extends new (...args: any[]) => any>(cls: T) => {
        return Meta(cls, args)
    }
}

Meta.declare = Meta.d = (metaTypeOrArgs?: MetaTypeFlag | MetaTypeArgs) => {
    return (target: object, propName: string) => {
        let metaTypeImpl: MetaTypeImpl = null

        if (MetaType.isMetaType(metaTypeOrArgs)) {
            metaTypeImpl = MetaType.getMetaImpl(metaTypeOrArgs)
        } else {
            if (propName in target) {
                metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(target[propName], metaTypeOrArgs)
            } else {
                const reflectMetadataFunc = Reflect['getMetadata']

                if (reflectMetadataFunc) {
                    const typeConstructor = reflectMetadataFunc('design:type', target, propName)

                    if (typeConstructor === Number) {
                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(1, metaTypeOrArgs)
                    } else if (typeConstructor === String) {
                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl('str', metaTypeOrArgs)
                    } else if (typeConstructor === Boolean) {
                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(true, metaTypeOrArgs)
                    } else if (typeConstructor === BigInt) {
                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(1n, metaTypeOrArgs)
                    } else if (typeConstructor === Date) {
                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(new Date(), metaTypeOrArgs)
                    } else if (typeConstructor === Array) {
                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl([null], metaTypeOrArgs)
                    } else if (typeConstructor === Object) {
                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(null, metaTypeOrArgs)
                    } else if (!typeConstructor) {
                        metaTypeImpl = null
                    } else {
                        const fakeInstance = Object.create(typeConstructor.prototype)

                        metaTypeImpl = MetaTypeImpl.getMetaTypeImpl(fakeInstance, metaTypeOrArgs)
                    }
                }
            }
        }

        if (metaTypeImpl) {
            target[MetaObjectInitialDeclarationsSymbol] = {
                ...(target[MetaObjectInitialDeclarationsSymbol] || {}),
                [propName]: metaTypeImpl
            }
        }
    }
}

export const isMetaObject = (Meta.isMetaObject = function isMetaObject(obj: any) {
    return getDescriptorValue(obj, IsMetaObjectSymbol)
})

Meta.validationIsActive = (obj: object) => {
    return getDescriptorValue(obj, MetaObjectValidationIsActiveSymbol) || false
}

Meta.disableValidation = (obj: object) => {
    obj[MetaObjectValidationIsActiveSymbol] = false
}

Meta.enableValidation = (obj: object) => {
    obj[MetaObjectValidationIsActiveSymbol] = true
}

Meta.serializersIsActive = (obj: object) => {
    return getDescriptorValue(obj, MetaObjectSerializationIsActiveSymbol) || false
}

Meta.disableSerializers = (obj: object) => {
    obj[MetaObjectSerializationIsActiveSymbol] = false
}

Meta.enableSerializers = (obj: object) => {
    obj[MetaObjectSerializationIsActiveSymbol] = true
}

Meta.validate = (obj: object, raw: object) => {
    if (!Meta.isMetaObject(obj)) {
        obj = Meta(obj)
    }

    const handlerInstance = obj[MetaObjectBuilderSymbol].handler as MetaLogicHandler

    return handlerInstance.validate(obj, raw)
}

Meta.serialize = (obj: object) => {
    if (!Meta.isMetaObject(obj)) {
        obj = Meta(obj)
    }

    const handlerInstance = obj[MetaObjectBuilderSymbol].handler as MetaLogicHandler

    return handlerInstance.serialize(obj)
}

Meta.deserialize = (obj: object, raw: object) => {
    if (!Meta.isMetaObject(obj)) {
        obj = Meta(obj)
    }

    const handlerInstance = obj[MetaObjectBuilderSymbol].handler as MetaLogicHandler

    return handlerInstance.deserialize(obj, raw)
}

Meta.getJsonSchema = (obj: object, override?: Record<string, any>) => {
    if (!Meta.isMetaObject(obj)) {
        obj = Meta(obj)
    }

    const handlerInstance = obj[MetaObjectBuilderSymbol].handler as MetaLogicHandler

    return handlerInstance.getJsonSchema(obj, override)
}

Meta.copy = <T extends object>(obj: T, args?: MetaArgs): T => {
    const newMeta = Meta(obj, { ...(args || {}), disableInheritance: true })

    if (!args?.disableInheritance) {
        Object.setPrototypeOf(newMeta, Object.getPrototypeOf(obj))
    }

    return newMeta
}

export const M = Meta

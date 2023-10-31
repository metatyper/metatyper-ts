import {
    IsMetaObjectSymbol,
    MetaObjectValidationIsActiveSymbol,
    MetaObjectSerializationIsActiveSymbol,
    MetaObjectInitialDeclarationsSymbol,
    MetaObjectBuilderSymbol
} from './symbols'

import { MetaObjectBuilder } from './builder'
import { MetaArgs } from './metaArgs'

import { MetaType, MetaTypeFlag } from '../metatypes'
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

Meta.declare = Meta.d = (metaType: MetaTypeFlag) => {
    return (target: object, propName: string) => {
        target[MetaObjectInitialDeclarationsSymbol] = {
            ...(target[MetaObjectInitialDeclarationsSymbol] || {}),
            [propName]: MetaType.getMetaImpl(metaType)
        }
    }
}

Meta.isMetaObject = function isMetaObject(obj: any) {
    return getDescriptorValue(obj, IsMetaObjectSymbol)
}

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

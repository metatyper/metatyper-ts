const DeepMapSourceRefSymbol = Symbol('DeepMapSourceRef')
const DeepMapCircularRefSymbol = Symbol('DeepMapCircularRef')

function isNotPlainObject(obj: any) {
    if (
        !(obj instanceof Object) ||
        MetaType.isMetaType(obj) ||
        obj instanceof MetaTypeImpl ||
        Meta.isMetaObject(obj) ||
        obj instanceof Date ||
        obj instanceof Function
    ) {
        return true
    }

    return false
}

export function objectDeepMap(obj: object, processFunc: (obj: object) => any) {
    const objectsMap = new WeakMap()

    if (isNotPlainObject(obj)) {
        return processFunc(obj)
    }

    function deepCopyAndResolveCycles() {
        if (isNotPlainObject(obj)) {
            return obj
        }

        let circularIndex = 1

        const newObj = {}

        newObj[DeepMapSourceRefSymbol] = {
            index: null,
            source: newObj
        }

        objectsMap.set(obj, newObj)

        const processingStack = [obj]

        while (processingStack.length > 0) {
            const origObj = processingStack.pop()
            const newObj = objectsMap.get(origObj)

            Object.entries<any>(origObj).forEach(([key, value]) => {
                if (!isNotPlainObject(value)) {
                    if (!objectsMap.has(value)) {
                        const newValue = {}

                        newValue[DeepMapSourceRefSymbol] = {
                            index: null,
                            source: newValue
                        }

                        objectsMap.set(value, newValue)
                        processingStack.push(value)

                        value = newValue
                    } else {
                        const ref = objectsMap.get(value)[DeepMapSourceRefSymbol]

                        if (ref.index === null) {
                            ref.index = circularIndex++
                        }

                        value = {
                            [DeepMapCircularRefSymbol]: ref
                        }
                    }
                }

                newObj[key] = value
            })
        }

        return newObj
    }

    const objCopy = deepCopyAndResolveCycles()

    function deepProcess(curObj: any) {
        if (!curObj[DeepMapSourceRefSymbol]?.index) {
            delete curObj[DeepMapSourceRefSymbol]
        }

        if (isNotPlainObject(curObj)) {
            return processFunc(curObj)
        }

        Object.entries<any>(curObj).forEach(([key, value]) => {
            curObj[key] = deepProcess(value)
        })

        return processFunc(curObj)
    }

    return deepProcess(objCopy)
}

objectDeepMap.circularRef = (
    obj: object
): {
    source: object
    index: number
} => {
    return Object.getOwnPropertyDescriptor(obj, DeepMapCircularRefSymbol)?.value ?? null
}

objectDeepMap.sourceRef = (
    obj: object
): {
    source: object
    index: number
} => {
    return Object.getOwnPropertyDescriptor(obj, DeepMapSourceRefSymbol)?.value ?? null
}

export function metaTypesSchemaToValue(obj: object) {
    return objectDeepMap(obj, (obj) => {
        if (MetaType.isMetaType(obj)) {
            obj = (obj as any).metaTypeImpl.default
        }

        if (obj instanceof MetaTypeImpl) {
            obj = obj.default
        }

        return obj
    })
}

export function inspectMetaValue(value: any) {
    return objectDeepMap(value, (value) => {
        if (typeof value === 'string') {
            return `'${value}'`
        }

        if (typeof value === 'bigint') {
            return `${value}n`
        }

        if (value instanceof Date) {
            return `Date(${value.toISOString()})`
        }

        if (value instanceof MetaTypeImpl) {
            return `${value}`
        }

        if (value instanceof Function) {
            return `[Function: ${value.name || '(anonymous)'}]`
        }

        if (MetaType.isMetaType(value)) {
            return `${value}`
        }

        if (Meta.isMetaObject(value)) {
            return `${value}`
        }

        if (Array.isArray(value)) {
            return `[${value.join(', ')}]`
        }

        if (value instanceof Object) {
            const circularRef = objectDeepMap.circularRef(value)

            if (circularRef) {
                return `[Circular *${circularRef.index}]`
            }

            const objOwnPropsStrings = Object.entries(value)
                .sort(([key1], [key2]) => key1.localeCompare(key2))
                .map(([name, value]) => {
                    return `${name}: ${value}`
                })

            const sourceRef = objectDeepMap.sourceRef(value)

            if (sourceRef) {
                return `<ref *${sourceRef.index}> { ${objOwnPropsStrings.join(', ')} }`
            } else {
                return `{ ${objOwnPropsStrings.join(', ')} }`
            }
        }

        return `${value}`
    })
}

import { Meta } from '../meta'
import { MetaType, MetaTypeImpl } from '../metatypes'

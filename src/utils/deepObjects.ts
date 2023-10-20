const DeepMapSourceRefSymbol = Symbol('DeepMapSourceRef')
const DeepMapCircularRefSymbol = Symbol('DeepMapCircularRef')

export function isNotPlainObject(obj: any) {
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

export function objectDeepMap(obj: object, processFunc: (value: any, obj: object) => any) {
    const objectsMap = new WeakMap()

    if (isNotPlainObject(obj)) {
        return processFunc(obj, obj)
    }

    function deepCopyAndResolveCycles() {
        if (isNotPlainObject(obj)) {
            return obj
        }

        let circularIndex = 1

        const newObj = Array.isArray(obj) ? [] : {}

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
                        const newValue = Array.isArray(value) ? [] : {}

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
        if (isNotPlainObject(curObj)) {
            return processFunc(curObj, objCopy)
        }

        if (!curObj[DeepMapSourceRefSymbol]?.index) {
            delete curObj[DeepMapSourceRefSymbol]
        }

        if (Array.isArray(curObj)) {
            curObj.forEach((value, i) => {
                curObj[i] = deepProcess(value)
            })
        } else {
            Object.entries<any>(curObj).forEach(([key, value]) => {
                curObj[key] = deepProcess(value)
            })
        }

        return processFunc(curObj, objCopy)
    }

    return deepProcess(objCopy)
}

objectDeepMap.circularRef = (
    obj: object
): {
    source: object
    index: number
} => {
    return (
        (obj &&
            obj instanceof Object &&
            Object.getOwnPropertyDescriptor(obj, DeepMapCircularRefSymbol)?.value) ||
        null
    )
}

objectDeepMap.sourceRef = (
    obj: object
): {
    source: object
    index: number
} => {
    return (
        (obj &&
            obj instanceof Object &&
            Object.getOwnPropertyDescriptor(obj, DeepMapSourceRefSymbol)?.value) ||
        null
    )
}

export function inspectMetaValue(value: any) {
    return objectDeepMap(value, (value) => {
        const circularRef = objectDeepMap.circularRef(value)

        if (circularRef) {
            return `[Circular *${circularRef.index}]`
        }

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

        if (value instanceof Object) {
            const sourceRef = objectDeepMap.sourceRef(value)

            if (Array.isArray(value)) {
                const arrayStrings = value.map((value) => {
                    return `${value}`
                })

                if (sourceRef) {
                    return `<ref *${sourceRef.index}> [ ${arrayStrings.join(', ')} ]`
                } else {
                    return `[ ${arrayStrings.join(', ')} ]`
                }
            } else {
                const objOwnPropsStrings = Object.entries(value)
                    .sort(([key1], [key2]) => key1.localeCompare(key2))
                    .map(([name, value]) => {
                        return `${name}: ${value}`
                    })

                if (sourceRef) {
                    return `<ref *${sourceRef.index}> { ${objOwnPropsStrings.join(', ')} }`
                } else {
                    return `{ ${objOwnPropsStrings.join(', ')} }`
                }
            }
        }

        return `${value}`
    })
}

import { Meta } from '../meta'
import { MetaType, MetaTypeImpl } from '../metatypes'

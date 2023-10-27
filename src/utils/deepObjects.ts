const DeepMapSourceRefSymbol = Symbol('DeepMapSourceRef')
const DeepMapCircularRefSymbol = Symbol('DeepMapCircularRef')

export function isNotPlainObject(obj: any, checkFunc?: (value: any) => boolean) {
    if (!checkFunc) {
        checkFunc = (value: any) => {
            return (
                Meta.isMetaObject(value) ||
                MetaType.isMetaType(value) ||
                value instanceof MetaTypeImpl ||
                value instanceof Promise ||
                value instanceof Function
            )
        }
    }

    if (!(obj instanceof Object) || obj instanceof Date || checkFunc(obj)) {
        return true
    }

    return false
}

export function objectDeepMap(
    obj: object,
    processFunc: (value: any, args: { rootObj: any; isRootValue: boolean }) => any,
    args?: {
        deepCopy?: boolean
        disableDeepProcess?: (value: any) => boolean
    }
) {
    const deepCopy = args?.deepCopy ?? true

    const objectsMap = new WeakMap()

    if (isNotPlainObject(obj, args?.disableDeepProcess)) {
        return processFunc(obj, {
            rootObj: obj,
            isRootValue: true
        })
    }

    function deepCopyAndResolveCycles() {
        if (isNotPlainObject(obj, args?.disableDeepProcess)) {
            return obj
        }

        const newObj = Array.isArray(obj) ? [] : {}

        newObj[DeepMapSourceRefSymbol] = {
            index: null,
            source: newObj
        }

        objectsMap.set(obj, newObj)

        let circularIndex = 1
        const processingStack = [obj]

        while (processingStack.length > 0) {
            const origObj = processingStack.pop()
            const newObj = objectsMap.get(origObj)

            Object.entries<any>(origObj).forEach(([key, value]) => {
                if (!isNotPlainObject(value)) {
                    if (!objectsMap.has(value)) {
                        const targetValue = deepCopy ? (Array.isArray(value) ? [] : {}) : value

                        targetValue[DeepMapSourceRefSymbol] = {
                            index: null,
                            source: targetValue
                        }

                        objectsMap.set(value, targetValue)
                        processingStack.push(value)

                        value = targetValue
                    } else {
                        const ref = objectsMap.get(value)[DeepMapSourceRefSymbol]

                        if (ref.index === null) {
                            ref.index = circularIndex++
                        }

                        value = {
                            [DeepMapCircularRefSymbol]: {
                                index: ref.index,
                                source: ref.source
                            }
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
        if (isNotPlainObject(curObj, args?.disableDeepProcess)) {
            return processFunc(curObj, {
                rootObj: objCopy,
                isRootValue: curObj === objCopy
            })
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

        return processFunc(curObj, {
            rootObj: objCopy,
            isRootValue: curObj === objCopy
        })
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

export function inspectMetaValue(
    value: any,
    args?: {
        checkIgnoredObjects?: (value: any) => boolean
    }
) {
    const checkIgnoredObjects = args?.checkIgnoredObjects

    if (isNotPlainObject(value, args?.checkIgnoredObjects)) {
        return `${value}`
    }

    return objectDeepMap(
        value,
        (value) => {
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

            if (MetaType.isMetaType(value)) {
                return `${value}`
            }

            if (Meta.isMetaObject(value)) {
                return `${value}`
            }

            if (value instanceof MetaTypeImpl) {
                return `${value}`
            }

            if (value instanceof Function) {
                return `[Function: ${value.name || '(anonymous)'}]`
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
        },
        {
            disableDeepProcess: checkIgnoredObjects
        }
    )
}

const MetaTypePreparedFlagSymbol = Symbol('MetaTypePreparedFlag')

export function prepareDeepSubTypes(obj: any, args?: MetaTypeArgs) {
    if (isNotPlainObject(obj, args?.disableDeepProcess)) {
        return MetaTypeImpl.getMetaTypeImpl(obj, args?.subTypesDefaultArgs)
    }

    if (Object.getOwnPropertyDescriptor(obj, MetaTypePreparedFlagSymbol)?.value) {
        return obj
    }

    return objectDeepMap(
        obj,
        (value, { isRootValue }) => {
            if (isRootValue) {
                return value
            }

            const circularRef = objectDeepMap.circularRef(value)

            if (circularRef) {
                value = {
                    [DeepMapCircularRefSymbol]: circularRef
                }
            }

            if (!isNotPlainObject(value, args?.disableDeepProcess)) {
                value[MetaTypePreparedFlagSymbol] = true
            }

            return MetaTypeImpl.getMetaTypeImpl(value, args?.subTypesDefaultArgs)
        },
        { disableDeepProcess: args?.disableDeepProcess }
    )
}

import { Meta } from '../meta'
import { MetaType, MetaTypeArgs, MetaTypeImpl } from '../metatypes'

const DeepMapSourceRefSymbol = Symbol('DeepMapSourceRef')
const DeepMapCircleRefSymbol = Symbol('DeepMapCircleRef')

export function objectDeepMap(obj: object, processFunc: (obj: object) => any) {
    const circlesMap = new WeakMap()

    let circleIndex = 1

    function _objectDeepProcess(curObj: any) {
        if (curObj instanceof Object && circlesMap.has(curObj)) {
            const circleObj = circlesMap.get(curObj)

            const sourceRef = circleObj[DeepMapSourceRefSymbol]

            if (!sourceRef) {
                circleObj[DeepMapSourceRefSymbol] = {
                    source: circleObj,
                    index: circleIndex++
                }
            } else {
                if (sourceRef.index === null) {
                    sourceRef.index = circleIndex++
                }
            }

            return {
                [DeepMapCircleRefSymbol]: sourceRef
            }
        }

        if (
            !(curObj instanceof Object) ||
            MetaType.isMetaType(curObj) ||
            curObj instanceof MetaTypeImpl ||
            Meta.isMetaObject(curObj) ||
            curObj instanceof Date ||
            curObj instanceof Function
        ) {
            return processFunc(curObj)
        }

        if (Array.isArray(curObj)) {
            const newArr = [...curObj]

            circlesMap.set(curObj, newArr)

            newArr.forEach((item, i) => {
                newArr[i] = _objectDeepProcess(item)
            })

            return processFunc(newArr)
        }

        // if object

        const newObj = { ...curObj }

        newObj[DeepMapSourceRefSymbol] = {
            source: newObj,
            index: null
        }

        circlesMap.set(curObj, newObj)

        Object.entries(newObj).forEach(([key, value]) => {
            newObj[key] = _objectDeepProcess(value)
        })

        if (newObj[DeepMapSourceRefSymbol].index === null) {
            delete newObj[DeepMapSourceRefSymbol]
        }

        return processFunc(newObj)
    }

    return _objectDeepProcess(obj)
}

objectDeepMap.circleRef = (
    obj: object
): {
    source: object
    index: number
} => {
    return Object.getOwnPropertyDescriptor(obj, DeepMapCircleRefSymbol)?.value ?? null
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
            const objOwnPropsStrings = Object.entries(value)
                .sort(([key1], [key2]) => key1.localeCompare(key2))
                .map(([name, value]) => {
                    const circleRef = objectDeepMap.circleRef(value)

                    return `${name}: ${circleRef ? `[Circular *${circleRef.index}]` : value}`
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

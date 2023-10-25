import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'

import { objectDeepMap } from '../../utils'
import { TypeBuildError } from '../../errors'

export const MetaRefSymbol = Symbol('MetaRef')

@MetaTypeImpl.registerMetaType
export class RefImpl extends MetaTypeImpl {
    name = 'REF'
    subType: {
        index: string
        source: any
    }

    prepareSubType(subType: any) {
        if (!subType) {
            throw new TypeBuildError('subType cannot be empty', RefImpl)
        }

        const circularRef = objectDeepMap.circularRef(subType)

        if (circularRef) {
            subType = circularRef.source
        }

        if (MetaType.isMetaType(subType)) {
            subType = MetaType.getMetaImpl(subType)
        }

        if (subType instanceof Object) {
            let ref = {
                index: null,
                source: null
            }

            if (subType[MetaRefSymbol]) {
                ref = subType[MetaRefSymbol]
            } else {
                ref['index'] = (Math.random() + 1).toString(36).substring(7)
                subType[MetaRefSymbol] = ref
            }

            return ref
        }

        throw new TypeBuildError('subType must be an object', RefImpl)
    }

    getJsonSchema() {
        return {
            $ref: this.subType?.index
        }
    }

    toString() {
        return `${this.name}<${this.subType?.index}>`
    }

    isMetaTypeOf(value: any) {
        if (value === null) {
            return true
        }

        return this.subType.source.isMetaTypeOf(value)
    }

    static isCompatible(value: any) {
        return !!objectDeepMap.circularRef(value)
    }

    static getCompatibilityScore() {
        return 2
    }
}

export type REF<T> = MetaType<T, RefImpl>

/**
 * metatype that refers to another metatype
 *
 * @param args - {@link MetaTypeArgs}
 */
export function REF<T>(subType: T | (() => T), args?: MetaTypeArgs<REF<T>>): any {
    if (subType instanceof Function) {
        subType = subType()
    }

    return MetaType<REF<T>>(
        RefImpl.build({
            ...args,
            subType
        })
    )
}

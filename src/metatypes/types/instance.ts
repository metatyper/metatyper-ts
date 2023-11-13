import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'

import { Class } from '../../utils'
import { TypeBuildError } from '../../errors'

export type InstanceMetaTypeArgs = {
    allowChildren?: boolean
}

@MetaTypeImpl.registerMetaType
export class InstanceImpl extends MetaTypeImpl {
    name = 'INSTANCE'

    prepareSubType(subType: any) {
        if (!subType || !(subType instanceof Object)) {
            throw new TypeBuildError('subType must be an instance or class', InstanceImpl)
        }

        // is it class
        if (subType instanceof Function && subType.prototype) {
            return subType
        }

        // is it instance
        if (Object.getPrototypeOf(subType)['constructor']) {
            // is not instance of the Object
            if (Object.getPrototypeOf(subType)['constructor'] !== Object) {
                return Object.getPrototypeOf(subType)['constructor']
            } else {
                throw new TypeBuildError('subType must be an instance or class', InstanceImpl)
            }
        }

        return subType
    }

    toString() {
        return `${this.name}<${this.subType.name}>`
    }

    isMetaTypeOf(value: any) {
        if (this.args.allowChildren || this.args.allowChildren === undefined) {
            return value instanceof this.subType
        }

        return value['constructor'] === this.subType
    }

    static isCompatible(value: any) {
        return (
            value instanceof Object &&
            Object.getPrototypeOf(value)['constructor'] &&
            Object.getPrototypeOf(value)['constructor'] !== Object
        )
    }

    static getCompatibilityScore(_value: any) {
        return 2
    }
}

export type INSTANCE<T> = MetaType<T, InstanceImpl>

/**
 * metatype for instances of any class
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * class A {
 *    a = 1
 * }
 *
 * const obj1 = Meta({ a: INSTANCE(A) }) // as { a: new A() }
 * obj1.a = new A()
 * // obj1.a = '2' -> type & validation error
 *
 * let obj2: INSTANCE<A> = null
 * obj2 = new A()
 * // obj2 = A -> type error
 * // obj2 = 'str'-> type error
 *
 * ```
 */
export function INSTANCE<T>(
    subType: Class<T>,
    args?: MetaTypeArgs<INSTANCE<T>> & InstanceMetaTypeArgs
): INSTANCE<T> {
    return MetaType<INSTANCE<T>>(
        InstanceImpl.build({
            ...args,
            subType
        })
    )
}

export const I = INSTANCE

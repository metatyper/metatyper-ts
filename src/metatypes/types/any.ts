import { MetaType } from '../metatype'
import { MetaTypeImpl, MetaTypeArgs } from '../metatypeImpl'

// getMetaType will find ANY if there is no other metatype
MetaTypeImpl.registerMetaType
export class AnyImpl extends MetaTypeImpl {
    name = 'ANY'

    static isCompatible(_value: any) {
        return true
    }
}

export type ANY = MetaType<any, AnyImpl>

/**
 * metatype that similar to the builtin 'any'
 *
 * @param args - {@link MetaTypeArgs}
 *
 * @example
 * ```ts
 * const obj1 = Meta({ a: ANY() }) // as { a: any }
 * obj1.a = 1
 * obj1.a = {}
 *
 * let obj2: ANY = 2
 * obj2 = {}
 * ```
 */
export function ANY(args?: MetaTypeArgs) {
    return MetaType<ANY>(AnyImpl.build(args))
}

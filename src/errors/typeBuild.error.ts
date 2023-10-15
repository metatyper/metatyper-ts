import { MetaTypeImpl } from '../metatypes'
import { Class } from '../utils/classes'
import { MetaError } from './meta.error'

export class TypeBuildError extends MetaError {
    metaTypeImplCls: Class<MetaTypeImpl>

    constructor(message: string, metaTypeImplCls: Class<MetaTypeImpl>) {
        super(`MetaType (impl: ${metaTypeImplCls.name}) build error: ${message}`)
    }
}

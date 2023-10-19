export function metaTypesSchemaToValue(obj: object) {
    if (MetaType.isMetaType(obj)) {
        obj = (obj as any).metaTypeImpl.default
    }

    if (obj instanceof MetaTypeImpl) {
        obj = obj.default
    }

    if (!(obj instanceof Object)) {
        return obj
    }

    if (obj instanceof Date) {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map(metaTypesSchemaToValue)
    }

    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
            return [key, metaTypesSchemaToValue(value)]
        })
    )
}

import { MetaType, MetaTypeImpl } from '../metatypes'

export const MetaTypeValidator = {
    name: 'MetaTypeValidator',
    validate: ({ value, metaTypeImpl }) => {
        return value === undefined || value === null || metaTypeImpl.isMetaTypeOf(value)
    }
}

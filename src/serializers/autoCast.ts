export const AutoCastSerializer = {
    name: 'AutoCast',
    serialize: (args: any) => args.metaTypeImpl.castToRawValue(args),
    deserialize: (args: any) => args.metaTypeImpl.castToType(args),
    serializePlaces: ['serialize'] // MetaObj1.someProp will not use this serializer (only Meta.serialize(metaObj1))
}

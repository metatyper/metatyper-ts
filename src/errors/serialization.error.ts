import {
    DeSerializePlaceType,
    MetaTypeImpl,
    SerializePlaceType,
    SerializerType
} from '../metatypes'
import { inspectMetaValue } from '../utils'
import { MetaError } from './meta.error'

export class MetaTypeSerializationError extends MetaError {
    readonly serializer: SerializerType
    readonly metaTypeImpl: MetaTypeImpl
    readonly value: any
    readonly targetObject: object
    readonly propName: string
    readonly place: SerializePlaceType | DeSerializePlaceType
    readonly subError: Error

    constructor({
        serializer,
        targetObject,
        propName,
        value,
        metaTypeImpl,
        place,
        subError
    }: {
        serializer: SerializerType
        targetObject?: object
        propName?: string
        value: any
        metaTypeImpl: MetaTypeImpl
        place: SerializePlaceType | DeSerializePlaceType
        subError: Error
    }) {
        const message = `MetaType serialization error {propName: ${
            propName || 'unknown'
        }; value: ${inspectMetaValue(
            value
        )}; metaType: ${metaTypeImpl}; place: ${place}; serializer: ${
            serializer['name'] || serializer.toString()
        }}
`

        super(message)

        this.subError = subError ?? null
        this.serializer = serializer
        this.targetObject = targetObject
        this.propName = propName
        this.value = value
        this.metaTypeImpl = metaTypeImpl
        this.place = place
    }
}

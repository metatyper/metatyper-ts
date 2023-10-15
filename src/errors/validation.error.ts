import { MetaTypeImpl, ValidatorType } from '../metatypes'
import { MetaError } from './meta.error'

export class MetaTypeValidationError extends MetaError {
    readonly targetObject: object
    readonly metaTypeImpl: MetaTypeImpl
    readonly validator: ValidatorType
    readonly propName: string
    readonly value: any
    readonly subError: Error

    constructor({
        validator,
        targetObject,
        propName,
        value,
        metaTypeImpl,
        subError
    }: {
        validator: ValidatorType
        targetObject?: object
        propName?: string
        value: any
        metaTypeImpl: MetaTypeImpl
        subError?: Error
    }) {
        const message = `MetaType validation error {propName: ${
            propName || 'unknown'
        }; value: ${value}; metaType: ${metaTypeImpl}; validator: ${
            validator.name ||
            (validator.validate && validator.validate.toString()) ||
            validator.toString()
        }}
`

        super(message)

        this.subError = subError ?? null
        this.validator = validator
        this.targetObject = targetObject
        this.propName = propName
        this.value = value
        this.metaTypeImpl = metaTypeImpl
    }
}

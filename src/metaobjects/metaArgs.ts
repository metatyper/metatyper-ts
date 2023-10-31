import { MetaTypeArgs, MetaTypeImpl } from '../metatypes'
import { MetaObjectBuilder } from './builder'

/**
 * Meta args
 *
 * @param name - meta object name (used in toString)
 * @param ignoredProps - enable default js logic for properties
 * @param disableValidation - disable all validators
 * @param disableSerialization - disable all serializers
 * @param disableInheritance - the meta object will not have a prototype
 * @param instanceArgs - MetaArgs for configuring function/class meta instances
 * @param metaTypesDefaultArgs - MetaTypeArgs for configuring all Meta types
 * @param metaBuilder - Instance of a meta objects builder (contains meta objects functionality)
 */
export type MetaArgs = {
    name?: string
    ignoredProps?: string[]
    disableValidation?: boolean
    disableSerialization?: boolean
    disableInheritance?: boolean
    instanceArgs?: MetaArgs
    metaTypesDefaultArgs?: MetaTypeArgs | ((metaTypeImpl: MetaTypeImpl) => MetaTypeArgs)
    metaBuilder?: MetaObjectBuilder
}

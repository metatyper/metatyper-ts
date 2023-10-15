export const NullableValidator = {
    name: 'NullableValidator',
    validate: ({ value }) => {
        if (value === null || value === undefined) {
            return false
        }

        return true
    }
}

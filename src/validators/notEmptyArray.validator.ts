export const NotEmptyArray = {
    name: 'NotEmptyArray',
    validate: ({ value }) => {
        return !value || value?.length > 0
    }
}

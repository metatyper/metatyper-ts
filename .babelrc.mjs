export default (api) => {
    api.cache(true)

    return {
        presets: [
            [
                '@babel/preset-env',
                {
                    ignoreBrowserslistConfig: true,
                    modules: false
                }
            ],
            '@babel/preset-typescript'
        ]
    }
}

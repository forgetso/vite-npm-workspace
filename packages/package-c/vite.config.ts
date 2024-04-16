import { defineConfig } from 'vite'

export default defineConfig( {
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'package-a'
        },
    },
    resolve: {
        preserveSymlinks: true // this is the fix!
    }
})

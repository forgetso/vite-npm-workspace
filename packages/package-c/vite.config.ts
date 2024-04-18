import {defineConfig} from 'vite'
import * as path from "node:path";
import { vitePluginWatchExternal } from "@myscope/vite-plugin-npm-workspaces";

export default async function () {
    const pluginExternal = await vitePluginWatchExternal({
        workspaceRoot: path.resolve('../..'),
        format: 'esm'
    })
    console.log("pluginExternal", pluginExternal)
    return defineConfig({
        build: {
            lib: {
                entry: 'src/index.ts',
                name: '@myscope/c'
            },
        },
        plugins: [pluginExternal],

    })
}

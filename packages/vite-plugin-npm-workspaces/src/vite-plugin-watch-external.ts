// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {Plugin} from "vite";
import path from "node:path";
import {build} from "esbuild";
import fs from "fs";
import debug from 'debug';
import ts from "typescript";
import fg from 'fast-glob';

type TsConfigPath = string

type FilePath = string

type ExternalFile<Key extends PropertyKey, Value> = [Key, Value];

type ExternalFiles = Record<string, TsConfigPath>

type VitePluginWatchExternalOptions = {
    workspaceRoot: string;
    fileTypes?: string[];
    format: 'esm' | 'cjs';

}

const log = debug(`vite-plugin-watch-external`);

const FILE_TYPES = ['ts', 'tsx'];

const getTsConfigFollowExtends = (filename: string, rootDir?: string): { [key: string]: any } => {
    let extendedConfig: { [key: string]: any } = {};
    let config = ts.readConfigFile(filename, ts.sys.readFile).config;
    if (config.extends) {
        const importPath = path.resolve(rootDir || '', config.extends);
        const newRootDir = path.dirname(importPath);
        extendedConfig = getTsConfigFollowExtends(importPath, newRootDir);
    }
    return {
        ...extendedConfig,
        ...config,
        compilerOptions: {
            ...extendedConfig.compilerOptions,
            ...config.compilerOptions,
        },
    };
}

const getFilesAndTsConfigs = async (workspacePath: string, packageDir: string, fileTypes: string[]): Promise<ExternalFile<FilePath, TsConfigPath>[]> => {
    const packagePath = path.resolve(workspacePath, packageDir)
    const tsConfigPath = path.resolve(packagePath, 'tsconfig.json')
    const tsconfig = getTsConfigFollowExtends(tsConfigPath)
    const rootDir = tsconfig.compilerOptions.rootDir
    const files = await fg(path.resolve(packagePath, `${rootDir}/**/*.(${fileTypes.join('|')})`))
    // keep the tsconfig path beside each file to avoid looking for file ids in arrays later
    return files.map((file: string) => [file, tsConfigPath])
}

const getExternalFileLists = async (workspaceRoot: string, fileTypes: string[]): Promise<ExternalFiles> => {

    const workspacePackageJson = path.resolve(workspaceRoot, 'package.json')
    const workspaces = JSON.parse(fs.readFileSync(workspacePackageJson, 'utf8')).workspaces
    const externalFiles: ExternalFiles = {}
    const filesConfigs: ExternalFile<FilePath, TsConfigPath>[] = (await Promise.all(workspaces.map(async (workspace: string) => {
        // get directories in each workspace
        const workspacePath = path.resolve(workspaceRoot, workspace.replace("*", ""))
        // get directories in workSpacePath
        const packages = fs.readdirSync(workspacePath)
        // get files and tsconfigs in each package
        return await Promise.all(packages.map(async (packageDir: string) => await getFilesAndTsConfigs(workspacePath, packageDir, fileTypes)))
    }))).flatMap((filesConfigs) => filesConfigs.flat())
    console.log("filesConfigs", filesConfigs)
    filesConfigs.map(([file, tsconfig]) => externalFiles[file] = tsconfig)
    return externalFiles

}

const getLoader = (fileExtension: string) => {
    // 'base64' | 'binary' | 'copy' | 'css' | 'dataurl' | 'default' | 'empty' | 'file' | 'js' | 'json' | 'jsx' | 'local-css' | 'text' | 'ts' | 'tsx'
    switch (fileExtension) {
        case '.ts':
        case '.tsx':
            return 'ts';
        case '.js':
        case '.jsx':
            return 'js';
        case '.css':
            return 'css';
        case '.json':
            return 'json';
        default:
            return 'text';
    }
}

const getOutExtension = (fileExtension: string) => {
    switch (fileExtension) {
        case '.ts':
        case '.tsx':
            return '.js';
        case '.js':
        case '.jsx':
            return '.js';
        case '.css':
            return '.css';
        case '.json':
            return '.json';
        default:
            return '.txt';
    }
}

const getOutDir = (file: string, tsconfig: { [key: string]: any }) =>
    // TODO allow for more complex outDir configurations
    path.dirname(file).replace(tsconfig.compilerOptions.rootDir.replace('./', ''), tsconfig.compilerOptions.outDir.replace('./', ''));


const getOutFile = (outdir: string, file: string, fileExtension: string) => {
    const outExtension = getOutExtension(fileExtension);
    return path.resolve(outdir, path.basename(file).replace(fileExtension,outExtension));
}

export const vitePluginWatchExternal = async (config: VitePluginWatchExternalOptions): Promise<Plugin<any>> => {
    const externalFiles = await getExternalFileLists(config.workspaceRoot, config.fileTypes || FILE_TYPES);

    return {
        name: 'vite-plugin-watch-external',
        async buildStart() {
            console.log("externalFiles", externalFiles)
            Object.keys(externalFiles).map((file) => {
                this.addWatchFile(file)
            });
        },
        async handleHotUpdate({file, server}) {
            log(`file', ${file}`);

            const tsconfigPath = externalFiles[file]
            if (!tsconfigPath) {
                log(`tsconfigPath not found for file ${file}`);
                return;
            }
            const tsconfig = getTsConfigFollowExtends(tsconfigPath)
            const fileExtension = path.extname(file);
            const loader = getLoader(fileExtension);
            const outdir = getOutDir(file, tsconfig)
            log(tsconfig.compilerOptions.rootDir)
            const outfile = getOutFile(outdir, file, fileExtension)
            log(`outfile ${outfile}`)
            const buildResult = await build({
                tsconfig: tsconfigPath,
                stdin: {
                    contents: fs.readFileSync(file, 'utf8'),
                    loader,
                    resolveDir: path.dirname(file),
                },
                outfile,
                platform: config.format === 'cjs' ? 'node' : 'neutral',
                format: config.format || 'esm',
            });
            log(`buildResult', ${JSON.stringify(buildResult)}`);
            server.ws.send({
                type: 'full-reload'
            });
        },
    }
}

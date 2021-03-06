/*
 * Copyright 2015 Alexander Pustovalov
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'path';
import express from 'express';
import multer from 'multer';
import {isArray} from 'lodash';
import * as clientManager from '../commons/clientManager.js';
import * as storageManager from './storageManager.js';
import * as projectCompiler from './projectCompiler.js';
import * as generatorManager from './generatorManager.js';
import * as config from '../commons/configuration.js';

let serverRef;

export function loopback(options){
    return Promise.resolve('Response: ' + options.message);
}

export function error(options){
    return Promise.reject('Response: ' + options.message);
}

export function setServer(server){
    serverRef = server;
    if(serverRef){
        const sandboxDeskDirPath = path.join(config.sandboxDirPath(), 'work', '.structor', 'desk').replace(/\\/g, '/');
        serverRef.app.use('/structor-sandbox-preview', express.static(sandboxDeskDirPath));
        const screenshotStorage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(sandboxDeskDirPath, 'assets', 'img').replace(/\\/g, '/'));
            },
            filename: (req, file, cb) => {
                cb(null, 'screenshot.png');
            }
        });
        const upload = multer({storage: screenshotStorage});
        serverRef.app.post('/structor-sandbox-screenshot', upload.single('screenshot'), (req, res, next) => {
            //console.log(req.file);
            res.status(204).end();
        });
    }
}

export function makeWorkingDirectory(options){
    const {generatorId, userId} = options;
    return storageManager.makeWorkingCopy(generatorId, userId);
}

export function removeWorkingDirectory(options){
    return storageManager.deleteWorkingCopy();
}

export function compileWorkingDesk(options){
    return projectCompiler.compileWorkingCopy();
}

export function getGeneratorSamples(options){
    return clientManager.getGeneratorSamples();
}

export function sandboxPrepare(options){
    return clientManager.sandboxPrepare(options.generatorId, options.version);
}

export function sandboxReadFiles(options){
    return clientManager.sandboxReadFiles(options.sampleId);
}

export function sandboxWriteFiles(options){
    return clientManager.sandboxWriteFiles(options.sampleId, options.filesObject);
}

export function sandboxGenerate(options){
    const {sampleId, metadata, model} = options;
    const groupName = 'TestGroup';
    const componentName = 'TestComponent';
    return generatorManager.initGeneratorData(groupName, componentName, model, metadata)
        .then(generatorData => {
            return clientManager.sandboxProcess(sampleId, generatorData);
        })
        .then(generatorData => {
            const {files} = generatorData;
            const defaultModelFileName = componentName + '.json';
            files.forEach(fileObject => {
                if(fileObject.outputFileName === defaultModelFileName){
                    try{
                        generatorData.defaultModel = JSON.parse(fileObject.sourceCode);
                    } catch(e){
                        console.error('Sandbox default model source code parsing: ' + e);
                    }
                }
            });
            if(!generatorData.defaultModel || !isArray(generatorData.defaultModel) || generatorData.defaultModel.length <= 0){
                generatorData.defaultModel = [{
                    type: componentName
                }];
            }
            return generatorData;
        });
}

export function saveSandboxGenerated(options){
    const {files, dependencies} = options;
    return generatorManager.installDependencies(dependencies).then(() => {
        return generatorManager.saveGenerated(files);
    });
}

export function sandboxPublish(options){
    return clientManager.sandboxPublish(options.sampleId, options.generatorKey, options.forceClone);
}


/*
 * Copyright (C) 2022 Solar Games LLC - All Rights Reserved
 *
 * Uranus Tools for PlayCanvas
 *
 * You may only use, distribute and modify this code under the terms
 * of the end user license agreement that you received with it.
 */

function getMessageBuffers(o, buffers) {

    Object.keys(o).forEach((k) => {

        if (o[k]) {
            if (o[k].buffer) {
                buffers.push(o[k].buffer);
            } else if (typeof o[k] === 'object') {
                this.getMessageBuffers(o[k], buffers);
            }
        }
    });
}

// --- POLYFILL ---

// --- if pc exists, add a dummy application instance to support regular pc scripts added to a web worker
let pcAppWorker;
try {
    if (pc) {
        pc.app = {
            scripts: {
                add: () => { }
            }
        };

        pcAppWorker = pc.app;
    }
} catch (e) { }

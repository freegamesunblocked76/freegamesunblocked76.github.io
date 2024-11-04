/*
 * Copyright (C) 2022 Solar Games LLC - All Rights Reserved
 *
 * Uranus Tools for PlayCanvas
 *
 * You may only use, distribute and modify this code under the terms
 * of the end user license agreement that you received with it.
 */

self.addEventListener('message', async event => {

    const type = event.data.type;

    switch (type) {
        case 'load-libraries': loadLibraries(event.data.data);
            break;
        case 'calculate-cells': calculateCells(event.data.data);
            break;
    }
});

function loadLibraries(data) {

    const libraries = data.libraries;

    if (libraries) {
        // --- each library is being loaded synchronously 
        for (const library of libraries) {
            self.importScripts(getWorkerLibraryUrl(library));
        }
    }

    prepare();
}

function getWorkerLibraryUrl(url) {

    // --- use a blob to load the script locally and avoid cross domain errors
    const content = `importScripts( "${url}" );`;
    return URL.createObjectURL(new Blob([content], { type: "text/javascript" }));
}


function prepare() {
    this.vec = new pc.Vec3();
    this.vec2 = new pc.Vec3();
    this.quat = new pc.Quat();
    this.matrix = new pc.Mat4();
}

function calculateCells(data) {

    // --- prepare data
    let baseEntity, node;
    const cellSize = data.cellSize;
    const payload = {
        instancesCount: 0,
        refBoundingBox: {
            halfExtents: new pc.Vec3(data.refBoundingBox[0], data.refBoundingBox[1], data.refBoundingBox[2])
        },
        singleInstance: true
    };

    const useBaseMatrix = data.useBaseMatrix;

    if (!useBaseMatrix) {
        baseEntity = new pc.Entity('', pcAppWorker);
        node = new pc.Entity('', pcAppWorker);

        const nodeRef = data.node;
        node.setLocalPosition(nodeRef.position.x, nodeRef.position.y, nodeRef.position.z);
        node.setLocalEulerAngles(nodeRef.rotation.x, nodeRef.rotation.y, nodeRef.rotation.z);
        node.setLocalScale(nodeRef.scale.x, nodeRef.scale.y, nodeRef.scale.z);

        baseEntity.addChild(node);
    }

    // --- prepare cells
    const buffer = data.buffer;
    let count = 0;

    for (let i = 0; i < buffer.length; i += 9) {

        let matrixData;

        // -- if the base entity is the same as the node, we can skip calculating the world matrix and use the data directly
        if (useBaseMatrix) {

            const position = this.vec.set(buffer[i + 0], buffer[i + 1], buffer[i + 2]);
            const rotation = this.quat.setFromEulerAngles(buffer[i + 3], buffer[i + 4], buffer[i + 5]);
            const scale = this.vec2.set(buffer[i + 6], buffer[i + 7], buffer[i + 8]);

            matrix = this.matrix;
            matrixData = matrix.setTRS(position, rotation, scale).data;

        } else {
            baseEntity.setPosition(buffer[i + 0], buffer[i + 1], buffer[i + 2]);
            baseEntity.setEulerAngles(buffer[i + 3], buffer[i + 4], buffer[i + 5]);
            baseEntity.setLocalScale(buffer[i + 6], buffer[i + 7], buffer[i + 8]);

            matrix = node.getWorldTransform();
            matrixData = matrix.data;
        }

        // --- add instance to cells
        const instance = {
            data: matrixData,
            cullPosition: matrix.getTranslation()
        };

        UranusInstancerCell.prototype.addInstanceToPayload(instance, payload, null, cellSize);

        count++;
    }

    payload.instancesCount = count;

    // --- convert all cell buffers to typed arrays
    payload.cells.forEach(cell => {
        cell.buffer = Float32Array.from(cell.buffer);
    });

    // --- send the cell buffers back to the main thread
    // --- prepare transferrable buffers
    const buffers = [];
    getMessageBuffers(payload, buffers);

    self.postMessage({
        type: `calculate-cells:${data.id}`,
        data: {
            payload
        }
    }, buffers);
}
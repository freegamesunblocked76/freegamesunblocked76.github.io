/*
 * Copyright (C) 2022 Solar Games LLC - All Rights Reserved
 *
 * Uranus Tools for PlayCanvas
 *
 * You may only use, distribute and modify this code under the terms
 * of the end user license agreement that you received with it.
 */

var UranusInstancerCell = {
    prototype: {}
};

UranusInstancerCell.prototype.addInstanceToPayload = function (instance, payload, node, cellSize, cullingRadius) {

    // --- get cell id from instance position
    const entity = instance.entity;
    const instancePos = instance.cullPosition ? instance.cullPosition : entity.getPosition();

    const cell = UranusInstancerCell.prototype.getCellFromPosition(instancePos, payload, cellSize, cullingRadius);

    // --- add instance to cell
    if (payload && !payload.singleInstance) {
        cell.instances.push(instance);
    }

    const matrices = cell.buffer;
    const matrixData = instance.data ? instance.data : node.getWorldTransform().data;

    let matrixIndex = matrices.length;

    // --- add cell to instance
    instance.cell = cell;

    // --- set instance scripts to cell if available
    const lodScript = instance.lodScript;
    if (lodScript) cell.lodScript = lodScript;
    if (cell.hasEntities === undefined && entity) cell.hasEntities = true;

    // --- prefill cell buffer
    for (let m = 0; m < 16; m++) {
        matrices[matrixIndex++] = matrixData[m];
    }
};

UranusInstancerCell.prototype.removeInstanceFromPayload = function (instance, payload) {

    // --- remove instance from cell
    const cell = instance.cell;
    if (!cell) return;

    const cellIndex = cell.instances.indexOf(instance);

    if (cellIndex > -1) {
        cell.instances.splice(cellIndex, 1);
        cell.buffer.splice(cellIndex * 16, 16);
    }

    // --- remove cell if empty
    if (cell.instances.length === 0) {
        payload.cells.delete(cell.id);
    }
};

UranusInstancerCell.vec = new pc.Vec3();

UranusInstancerCell.prototype.getPositionOnGrid = function (instancePos, cellSize) {
    // --- find cell guid
    const cellSizeX = Math.max(cellSize.x, 1);
    const cellSizeY = Math.max(cellSize.y, 1);
    const cellSizeZ = Math.max(cellSize.z, 1);

    const x = Math.floor(instancePos.x / cellSizeX) * cellSizeX;
    const y = Math.floor(instancePos.y / cellSizeY) * cellSizeY;
    const z = Math.floor(instancePos.z / cellSizeZ) * cellSizeZ;

    const pos = UranusInstancerCell.vec.set(x, y, z);

    return pos;
};

UranusInstancerCell.prototype.getCellGuid = function (x, y, z, cellSize) {

    const cellGuid = x.toFixed(0) + '_' + y.toFixed(0) + '_' + z.toFixed(0) + '-' + cellSize.x + '_' + cellSize.y + '_' + cellSize.z;

    return cellGuid;
};

UranusInstancerCell.prototype.calculateCellBounding = function (gridPos, cellSize) {
    // --- calculate cell bounding
    const aabb = new pc.BoundingBox();

    const halfExtents = aabb.halfExtents.copy(pc.Vec3.ZERO);
    halfExtents.x += cellSize.x / 2;
    halfExtents.y += cellSize.y / 2;
    halfExtents.z += cellSize.z / 2;

    const center = aabb.center.copy(gridPos);

    center.x += halfExtents.x;
    center.y += halfExtents.y;
    center.z += halfExtents.z;

    return aabb;
};

UranusInstancerCell.prototype.getCellFromPosition = function (instancePos, payload, cellSize, cullingRadius) {

    // --- find cell guid
    const cellSizeX = Math.max(cellSize.x, 1);
    const cellSizeY = Math.max(cellSize.y, 1);
    const cellSizeZ = Math.max(cellSize.z, 1);

    const x = Math.floor(instancePos.x / cellSizeX) * cellSizeX;
    const y = Math.floor(instancePos.y / cellSizeY) * cellSizeY;
    const z = Math.floor(instancePos.z / cellSizeZ) * cellSizeZ;

    const cellGuid = this.getCellGuid(x, y, z, cellSize);

    // --- find cell, if it doesn't exist, create it
    if (!payload.cells) payload.cells = new Map();

    let cell = payload.cells.get(cellGuid);

    if (!cell) {

        // --- calculate cell bounding
        const refHalfExtents = payload.refBoundingBox.halfExtents;
        const halfExtents = new pc.Vec3();
        halfExtents.x += cellSize.x / 2 + refHalfExtents.x / 2;
        halfExtents.y += cellSize.y / 2 + refHalfExtents.y / 2;
        halfExtents.z += cellSize.z / 2 + refHalfExtents.z / 2;

        const radius = Math.max(halfExtents.x, halfExtents.y, halfExtents.z) * 2;

        const center = halfExtents.clone();
        center.x += x;
        center.y += y;
        center.z += z;

        // --- create new cell
        cell = UranusInstancerCell.prototype.createCell(cellGuid, center, halfExtents, radius, cullingRadius, payload);
    }

    return cell;
};

UranusInstancerCell.prototype.createCell = function (cellGuid, center, halfExtents, radius, cullingRadius, payload) {

    const cell = {
        aabb: new pc.BoundingBox(center, halfExtents),
        center,
        cullingRadius,
        radius,
        buffer: [],
        id: cellGuid,
        instances: payload.singleInstance === false ? [] : undefined,
        // lodScript: undefined,
        refLodIndices: []
    };

    payload.cells.set(cellGuid, cell);

    if (payload.shadowCaster) {
        payload.shouldUpdateShadows = true;
    }

    return cell;
};
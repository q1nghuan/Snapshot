import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { v4 as uuidv4 } from 'uuid';
import { WebsocketProvider } from "y-websocket";
import { Children } from "react";

export const IGNORE_PATTERNS = [".git"];
const WEBSOCKET_URL = "ws://localhost:1234";

export const getSnapshotData = (roomId) => {
    return new Promise((resolve, reject) => {
        const ydoc = new Y.Doc({ gc: false });
        const provider = new WebsocketProvider(WEBSOCKET_URL, `snap-${roomId}`, ydoc);
        const idbPersistence = new IndexeddbPersistence(`snap-${roomId}`, ydoc);
        let syncedCount = 0;
        const onSync = () => {
            syncedCount++;
            if (syncedCount === 2) {
                // console.log(User ${userId}'s data has been synced with both WebSocket and IndexedDB.);
                resolve({snapshotYdoc: ydoc, provider: provider});
            }
        };
        provider.once("synced", onSync);
        idbPersistence.once("synced", onSync);
    });
}
export const getUserData = (userId) => {
    return new Promise((resolve, reject) => {
        const ydoc = new Y.Doc;
        const provider = new WebsocketProvider(WEBSOCKET_URL, `user-${userId}`, ydoc);
        const idbPersistence = new IndexeddbPersistence(`user-${userId}`, ydoc);
        let syncedCount = 0;
        const onSync = () => {
            syncedCount++;
            if (syncedCount === 2) {
                // console.log(User ${userId}'s data has been synced with both WebSocket and IndexedDB.);
                resolve({userYdoc: ydoc, provider: provider});
            }
        };
        provider.once("synced", onSync);
        idbPersistence.once("synced", onSync);
    });
};
export const getProjectData = (roomId) => {
    return new Promise((resolve, reject) => {
        const ydoc = new Y.Doc({ gc: false });
        const provider = new WebsocketProvider(WEBSOCKET_URL, roomId, ydoc);
        const idbPersistence = new IndexeddbPersistence(`doc-${roomId}`, ydoc);
        let syncedCount = 0;
        const onSync = () => {
            syncedCount++;
            if (syncedCount === 2) {
                // console.log(room ${roomId} has been synced with both WebSocket and IndexedDB.);
                resolve({projectYdoc: ydoc, provider: provider});
            }
        };
        provider.once("synced", onSync);
        idbPersistence.once("synced", onSync);
    });
};
export const clearUserIndexedDB = (userId) => {
    const dbName = `user-${userId}`;
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = function () {
        console.log(`IndexedDB database "${dbName}" has been successfully deleted.`);
    };
    request.onerror = function (event) {
        console.error("Failed to delete IndexedDB:", event);
    };
};
export const clearDocIndexedDB = (docId) => {
    const dbName = `doc-${docId}`;
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = function () {
        console.log(`IndexedDB database "${dbName}" has been successfully deleted.`);
    };
    request.onerror = function (event) {
        console.error("Failed to delete IndexedDB:", event);
    };
};
export const saveSnapshot = async (id, snapYdoc, name) => {
    const { projectYdoc } = await getProjectData(id);
    const snapshotsMap = snapYdoc.getMap("snapshotsMap");
    const snapshot = Y.snapshot(projectYdoc);
    const encodedSnapshot = Y.encodeSnapshot(snapshot);
    snapshotsMap.set(name, encodedSnapshot);
};
export const loadSnapshot = async (id, ydoc, name) => {
    const { projectYdoc } = await getProjectData(id);
    const snapshotsMap = ydoc.getMap("snapshotsMap");
    const encodedSnapshot = snapshotsMap.get(name);
    const decodedSnapshot = Y.decodeSnapshot(encodedSnapshot);
    const tempDoc = Y.createDocFromSnapshot(projectYdoc, decodedSnapshot);
    const restoredProjectMap = tempDoc.getMap("rootdir");
    const originalProjectMap = projectYdoc.getMap("rootdir");
    originalProjectMap.clear();
    ydoc.transact(() => {
        copyYMap(restoredProjectMap, originalProjectMap);
    });
    
    console.log("loadSnapshot over");
};
export const deleteSnapshot = async (ydoc, name) => {
    const snapshotMap = ydoc.getMap("snapshotsMap");
    if (!snapshotMap.has(name)) {
        console.error("Illegal snapshotId!");
        return;
    }
    snapshotMap.delete(name);
};
export const getSnapshotInfo = async (ydoc, rootPath) => {
    const snapshotsMap = ydoc.getMap("snapshotsMap");
    const snapshotMap = snapshotsMap.get(rootPath);
    if (!snapshotMap.size) {
        return [];
    }
    const snapshotInfoArray = [];
    for (const [snapshotKey, snapshotEntry] of snapshotMap) {
        const { snapshotId, creationTime } = snapshotEntry;
        snapshotInfoArray.push({ snapshotId, creationTime });
    }
    return snapshotInfoArray;
};
const getFileInfoFromMap = async (map) => {
    const folderInfo = [];
    for (const [key, value] of map) {
      if (value instanceof Y.Map) {
        const children = await getFileInfoFromMap(value);
        folderInfo.push({
          id: key,
          name: key,
          type: "folder",
          children: children
        });
      }
      else if (value instanceof Y.Text) {
        folderInfo.push({
          id: key,
          name: key,
          type: "file",
          content: value.toString()
        });
      }
    }
    return folderInfo;
  };
export const getFileInfo = async(ydoc) => {
    const rootdir = ydoc.getMap("rootdir");
    if (!rootdir.size) {
        return [];
    }
    const projectInfo = [];
    for (const [key, value] of rootdir) {
        if (value instanceof Y.Map) {
            const children = await getFileInfoFromMap(value);
            projectInfo.push({
                id: key,
                name: key,
                type: "folder",
                children: children
            });
        }
        else if (value instanceof Y.Text) {
            projectInfo.push({
                id: key,
                name: key, 
                type: "file",
                content: value.toString()
            });
        }
    }
    return projectInfo.length > 0 ? projectInfo : null; 
};
export const getProjectsInfo = async (ydoc) => {
    let projectsId = [];
    const projectsMap = ydoc.getMap("projectsMap");
    projectsMap.forEach((value) => {
        projectsId.push(value.id);
    });
    // console.log("projectsId", projectsId)
    let projectsInfo = [];
    
    for (const roomid of projectsId) {
        const {projectYdoc} = await getProjectData(roomid);
        const fileData = await getFileInfo(projectYdoc);
        let file = []
        if (fileData && fileData.length > 0)
            file = fileData
        projectsInfo.push({
            id: roomid,
            name: roomid,
            files: file
        })
    }
    return projectsInfo;
};
const copyYMap = (sourceMap, targetMap) => {
    const stack = [];
    stack.push({ source: sourceMap, target: targetMap });
    while (stack.length > 0) {
        const { source, target } = stack.pop();
        source.forEach((value, key) => {
            if (value instanceof Y.Map) {
                const newMap = new Y.Map();
                target.set(key, newMap);
                stack.push({ source: value, target: newMap });
            } else if (value instanceof Y.Text) {
                const newText = new Y.Text();
                newText.insert(0, value.toString());
                target.set(key, newText);
            } else {
                target.set(key, value);
            }
        });
    }
};
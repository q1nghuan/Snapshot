import { useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { X } from 'react-feather'
import { SnapshotDialog } from "./SnapshotDialog"
import '../styles/SnapshotPanel.css'
import { getSnapshotData, saveSnapshot, deleteSnapshot, loadSnapshot } from '../store/useYdocStore'
export function SnapshotPanel({ currentProject, currentNode, onUpdateFile }) {
  const [snapshots, setSnapshots] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const snapshotRef = useRef()
  useEffect(() => {
    const fetchData = async () => {
      const snapshotData = await getSnapshotData(currentProject.id);
      snapshotRef.current = snapshotData;
      const snapshotYdoc = snapshotRef.current.snapshotYdoc;
      const snapshotMap = snapshotYdoc.getMap('snapshotsMap');
      let snapshots = [];
      for (const [key, value] of snapshotMap) {
        snapshots.push({
          id: key,
        });
      }
      setSnapshots(snapshots);
    };
    if(currentProject)
      fetchData();
  }, [currentProject])

  const projectSnapshots = snapshots;

  const funcSaveSnapshot = (name) => {
    console.log("savesnapshot", name);
    if (!currentProject) return
    const newSnapshot = {
      id: name
    }
    console.log(snapshotRef.current.snapshotYdoc, "currentSnapshotYdoc");
    saveSnapshot(currentProject.id, snapshotRef.current.snapshotYdoc, name);
    setSnapshots([newSnapshot, ...snapshots])
  }

  const restoreSnapshot = (snapshot) => {
    loadSnapshot(currentProject.id, snapshotRef.current.snapshotYdoc, snapshot.id);
  }

  const funcDeleteSnapshot = (name) => {
    deleteSnapshot(snapshotRef.current.snapshotYdoc, name);
    setSnapshots(snapshots.filter((s) => s.id !== name))
  }

  return (
    <div className="snapshot-panel">
      <div className="snapshot-panel__content">
        <div className="snapshot-panel__header">
          <h3 className="snapshot-panel__title">History Snapshots</h3>
          <button
            onClick={() => setIsDialogOpen(true)}
            disabled={!currentProject}
            className="button button--primary"
          >
            Save Snapshot
          </button>
        </div>

        <div className="snapshot-panel__list">
          {projectSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="snapshot-item">
              <div className="snapshot-item__header">
                <h4 className="snapshot-item__title">{snapshot.id}</h4>
                <button
                  className="snapshot-item__delete"
                  onClick={() => funcDeleteSnapshot(snapshot.id)}
                >
                  <X className="snapshot-item__icon" />
                </button>
              </div>
              {/* <div className="snapshot-item__time">
                {formatDistanceToNow(snapshot.timestamp, { addSuffix: true })}
              </div> */}
              <button
                className="snapshot-item__restore"
                onClick={() => restoreSnapshot(snapshot)}
              >
                Restore this version
              </button>
            </div>
          ))}

          {projectSnapshots.length === 0 && currentProject && (
            <div className="snapshot-panel__empty">
              No snapshots for current project
            </div>
          )}

          {!currentProject && (
            <div className="snapshot-panel__empty">
              Select a project to view snapshots
            </div>
          )}
        </div>
      </div>

      <SnapshotDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSave={funcSaveSnapshot} 
      />
    </div>
  )
}
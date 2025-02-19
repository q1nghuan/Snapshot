import { useState } from "react"
import '../styles/SnapshotDialog.css'

export function SnapshotDialog({ open, onClose, onSave }) {
  const [snapshotName, setSnapshotName] = useState("")

  const handleSave = () => {
    if (!snapshotName.trim()) return
    onSave(snapshotName)
    setSnapshotName("")
    onClose()
  }

  if (!open) return null

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2 className="dialog__title">Save Snapshot</h2>
        <p className="dialog__description">
          Create a named snapshot of the current file state.
        </p>
        <input
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          placeholder="Enter snapshot name"
          className="dialog__input"
        />
        <div className="dialog__actions">
          <button
            className="dialog__button dialog__button--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="dialog__button dialog__button--primary"
            onClick={handleSave}
            disabled={!snapshotName.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
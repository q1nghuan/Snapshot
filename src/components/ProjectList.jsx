import { ChevronRight, Folder, File } from 'react-feather'
import { useState } from 'react'
import '../styles/ProjectList.css'

export function ProjectList({ projects, currentProject, currentNode, onSelectProject, onSelectNode }) {
  const [expandedFolders, setExpandedFolders] = useState(new Set())

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFileTree = (nodes, level = 0) => {
    return nodes.map((node) => {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders.has(node.id)
        return (
          <div 
            key={node.id} 
            className="file-tree__item"
            style={{ marginLeft: `${level * 16}px` }}
          >
            <button
              className="file-tree__folder"
              onClick={() => toggleFolder(node.id)}
            >
              <ChevronRight className={`file-tree__icon ${isExpanded ? 'file-tree__icon--rotated' : ''}`} />
              <Folder className="file-tree__icon" />
              <span>{node.name}</span>
            </button>
            {isExpanded && node.children && (
              <div className="file-tree__children">
                {renderFileTree(node.children, level + 1)}
              </div>
            )}
          </div>
        )
      }

      return (
        <button
          key={node.id}
          className={`file-tree__file ${currentNode?.id === node.id ? 'file-tree__file--active' : ''}`}
          style={{ marginLeft: `${(level + 1) * 16}px` }}
          onClick={() => onSelectNode(node)}
        >
          <File className="file-tree__icon" />
          {node.name}
        </button>
      )
    })
  }

  return (
    <div className="project-list">
      {projects.map((project) => (
        <div key={project.id} className="project-list__item">
          <button
            className={`project-list__button ${currentProject?.id === project.id ? 'project-list__button--active' : ''}`}
            onClick={() => onSelectProject(project)}
          >
            {project.name}
          </button>
          {currentProject?.id === project.id && renderFileTree(project.files)}
        </div>
      ))}
    </div>
  )
}
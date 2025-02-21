import { use, useState } from "react"
import { Plus, FolderPlus } from 'react-feather'
import Quill from "quill";
import { QuillBinding } from "y-quill";
import "quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";
import * as Y from "yjs";
import "../styles/FileEditor.css";
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useRef } from "react";
Quill.register('modules/cursors', QuillCursors); 

export function FileEditor({ projectsDocs, project, currentNode, onUpdateProject, onCreateFile, onSelectNode }) {
  const [newItemName, setNewItemName] = useState("")
  const [selectedParentId, setSelectedParentId] = useState("")
  const [newItemType, setNewItemType] = useState('file')
  
  // 使用useRef获取编辑器容器
  const quillContainerRef = useRef(null); // 创建一个ref来引用DOM元素
  const quillRef = useRef(null); // 用来引用Quill实例
  const bindingRef = useRef(null);
  const getCurrentYext = () => {
    if(!project || !currentNode || currentNode?.type !== 'file') return;
    const ydoc = projectsDocs[project.id]?.projectYdoc;
    console.log(ydoc, currentNode, project, "isnull?");
    const rootdir = ydoc.getMap("rootdir");
    const getYext = (map) => {
      for (const [key, value] of map) {
        if(key === currentNode.id) {
          return value;
        }
        if (value instanceof Y.Map) {
          const result = getYext(value);
          if(result) return result;
        }
      }
    }
    return getYext(rootdir);
  }

  useEffect(() => {
    if (!quillContainerRef.current || !currentNode || currentNode?.type !== "file") return;
    if (!quillRef.current) {
      // 仅在第一次渲染时创建Quill实例
      const quill = new Quill(quillContainerRef.current, {
        theme: "snow",
        modules: {
          cursors: true,
          toolbar: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
            ["clean"],
          ],
          history: {
            userOnly: true,
          },
        },
      });
      quillRef.current = quill;
    }
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [currentNode]);

  useEffect(() => {
    if (!currentNode || currentNode?.type !== "file" || !quillRef.current) return;

    const ytext = getCurrentYext(); // 获取当前ytext
    if (!ytext) return;

    if (bindingRef.current) {
      bindingRef.current.destroy(); // 如果已经绑定，先销毁之前的绑定
    }

    const binding = new QuillBinding(ytext, quillRef.current);
    bindingRef.current = binding; // 保存当前的binding

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy(); // 清理绑定
      }
    };
  }, [currentNode]); // 依赖currentNode，确保每次文件节点变化时重新绑定ytext

  const getFolders = (nodes, path = "") => {
    let folders = []
    nodes.forEach(node => {
      if (node.type === 'folder') {
        const currentPath = path ? `${path}/${node.name}` : node.name
        folders.push({ id: node.id, path: currentPath })
        if (node.children) {
          folders = [...folders, ...getFolders(node.children, currentPath)]
        }
      }
    })
    return folders
  }

  const findAndUpdateNode = (nodes, nodeId, updateFn) => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return updateFn(node)
      }
      if (node.type === 'folder' && node.children) {
        return {
          ...node,
          children: findAndUpdateNode(node.children, nodeId, updateFn)
        }
      }
      return node
    })
  }

  const addNewItem = () => {
    if (!newItemName.trim()) return

    const newNode = {
      // id: Date.now().toString(),
      id: newItemName,
      name: newItemName,
      type: newItemType,
      ...(newItemType === 'folder' ? { children: [] } : { content: "" })
    }

    let updatedFiles = [...project.files]
    if (selectedParentId) {
      updatedFiles = findAndUpdateNode(updatedFiles, selectedParentId, (node) => ({
        ...node,
        children: [...(node.children || []), newNode]
      }))
    } else {
      updatedFiles.push(newNode)
    }
    onCreateFile(newNode, selectedParentId)
    onUpdateProject({
      ...project,
      files: updatedFiles
    })
    setNewItemName("")
  }

  const updateNodeContent = (content) => {
    if (!currentNode) return
    const updatedFiles = findAndUpdateNode(project.files, currentNode.id, (node) => ({
      ...node,
      content
    }))
    onUpdateProject({
      ...project,
      files: updatedFiles
    })
  }

  const folders = getFolders(project.files)

  return (
    <div className="file-editor">
      <section className="file-editor__section">
        <h3 className="file-editor__title">File Management</h3>
        <div className="file-editor__controls">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Enter name"
            className="file-editor__input"
          />
          <select
            value={newItemType}
            onChange={(e) => setNewItemType(e.target.value)}
            className="file-editor__select"
          >
            <option value="file">File</option>
            <option value="folder">Folder</option>
          </select>
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="file-editor__select"
          >
            <option value="">Root directory</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
          </select>
          <button
            onClick={addNewItem}
            className="button button--primary"
          >
            {newItemType === 'folder' ? <FolderPlus className="button__icon" /> : <Plus className="button__icon" />}
            New {newItemType === 'folder' ? 'Folder' : 'File'}
          </button>
        </div>
      </section>

      {currentNode?.type === 'file' && (
        <div className="file-editor__content">
          <div className="file-editor__header">
            <span className="file-editor__label">Current file:</span>
            <span className="file-editor__filename">{currentNode.name}</span>
          </div>
          {/* 使用 ref 引用 Quill 容器 */}
          <div ref={quillContainerRef} style={{ height: "400px" }} />
        </div>
      )}
    </div>
  )
}
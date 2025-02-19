import { useEffect, useRef, useState } from "react"
import { ProjectList } from "./ProjectList"
import { FileEditor } from "./FileEditor"
import { SnapshotPanel } from "./SnapshotPanel"
import { Plus, Edit, Trash } from 'react-feather'
import * as Y from "yjs";
import '../styles/ProjectEditor.css'
import { getProjectsInfo, getProjectData, getUserData, clearDocIndexedDB } from '../store/useYdocStore'

export function ProjectEditor() {
  const [userId, setUserId] = useState('1');
  const [projects, setProjects] = useState([])
  const [userData, setUserData] = useState({})
  const [currentProject, setCurrentProject] = useState(null)
  const [currentNode, setCurrentNode] = useState(null)
  const [newItemName, setNewItemName] = useState("")
  const [updatedDocs, setUpdatedDocs] = useState({});
  const projectsDocs = useRef({})
  
  useEffect(() => {
    const fetchData = async () => {
      const userData = await getUserData(userId);
      const userYdoc = userData.userYdoc;
      // console.log(userYdoc, "userYdoc");
      const projects = await getProjectsInfo(userYdoc);
      console.log(projects, "projects");
      setProjects(projects);
      setUserData(userData);
      // projects.forEach(async (project) => {
      //   projectsDocs.current[project.id] = await getProjectData(project.id);
      // });
      const projectPromises = projects.map(async (project) => {
        projectsDocs.current[project.id] = await getProjectData(project.id);
      });
      await Promise.all(projectPromises);
      setUpdatedDocs(projectsDocs.current);
    };
    fetchData();
  }, [userId])

  
  const createFile = (file, parentId) => {
    const projectYdoc = projectsDocs.current[currentProject.id].projectYdoc;
    const rootdir = projectYdoc.getMap("rootdir");
    let ymap = null;
    let ytext = null;
    if(file.type === "folder") ymap = new Y.Map();
    if(file.type === "file") {
      ytext = new Y.Text();
      ytext.insert(0, file.content);
    }
    if(!parentId) {
      if(file.type === "folder")
        rootdir.set(file.id, ymap);
      else rootdir.set(file.id, ytext);
    }
    else {
      const addFileToParent = (map, parentId) => {
        for (const [key, value] of map) {
          if (key === parentId) {
            if(file.type === 'folder') {
              value.set(file.id, ymap)
            }
            else if(file.type === 'file') {
              value.set(file.id, ytext);
            }
            return true; 
          }
          if (value instanceof Y.Map) {
            const found = addFileToParent(value, parentId);
            if (found) {
              return true; 
            }
          }
        }
        return false;
      };
      addFileToParent(rootdir, parentId);
    }
  };
  const createProject = async () => {
    if (!newItemName.trim()) return
    const newProject = {
      // id: Date.now().toString(),
      id: newItemName,
      name: newItemName,
      files: [],
    }
    projectsDocs.current[newProject.id] = await getProjectData(newProject.id);
    const userYdoc = userData.userYdoc;
    const projectsMap = userYdoc.getMap("projectsMap");
    projectsMap.set(newProject.id, newProject);
    setProjects([...projects, newProject])
    setNewItemName("")
  }

  const renameProject = () => {
    if (!currentProject || !newItemName.trim()) return
    setProjects(projects.map((p) => (p.id === currentProject.id ? { ...p, name: newItemName } : p)))
    setNewItemName("")
  }

  const deleteProject = () => {
    if (!currentProject) return
    const userYdoc = userData.userYdoc;
    const projectsMap = userYdoc.getMap("projectsMap");
    projectsMap.delete(currentProject.id);
    const { provider } = projectsDocs.current[currentProject.id];
    provider.destroy()
    clearDocIndexedDB(currentProject.id)
    setProjects(projects.filter((p) => p.id !== currentProject.id))
    setCurrentProject(null)
    setCurrentNode(null)
  }

  return (
    <div className="project-editor">
      <div className="project-editor__sidebar" />
      <div className="project-editor__main">
        <div className="project-editor__content">
          <h1 className="project-editor__title">MultiSnap-Editor</h1>

          <div className="project-editor__sections">
            <section className="editor-section">
              <h3 className="editor-section__title">Project Management</h3>
              <ProjectList 
                projects={projects} 
                currentProject={currentProject} 
                currentNode={currentNode}
                onSelectProject={setCurrentProject}
                onSelectNode={setCurrentNode}
              />
              <div className="editor-section__actions">
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter project name"
                  className="editor-input"
                />
                <button 
                  onClick={renameProject} 
                  className="button button--secondary"
                >
                  <Edit className="button__icon" />
                  Rename
                </button>
                <button 
                  onClick={createProject} 
                  className="button button--primary"
                >
                  <Plus className="button__icon" />
                  New Project
                </button>
                <button 
                  onClick={deleteProject} 
                  className="button button--danger"
                >
                  <Trash className="button__icon" />
                  Delete
                </button>
              </div>
            </section>

            {currentProject && (
              <FileEditor
                projectsDocs={updatedDocs}
                project={currentProject}
                currentNode={currentNode}
                onCreateFile={createFile}
                onUpdateProject={(updatedProject) => {
                  setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)))
                  setCurrentProject(updatedProject)
                }}
                onSelectNode={setCurrentNode}
              />
            )}
          </div>
        </div>
      </div>

      <SnapshotPanel
        currentProject={currentProject}
        currentNode={currentNode}
        onUpdateFile={(updatedContent) => {
          if (!currentNode || !currentProject || currentNode.type !== 'file') return

          const findAndUpdateNode = (nodes) => {
            return nodes.map(node => {
              if (node.id === currentNode.id) {
                return { ...node, content: updatedContent }
              }
              if (node.type === 'folder' && node.children) {
                return { ...node, children: findAndUpdateNode(node.children) }
              }
              return node
            })
          }

          const updatedProject = {
            ...currentProject,
            files: findAndUpdateNode(currentProject.files)
          }

          setProjects(projects.map((p) => (p.id === currentProject.id ? updatedProject : p)))
          setCurrentProject(updatedProject)
          setCurrentNode({ ...currentNode, content: updatedContent })
        }}
      />
    </div>
  )
}
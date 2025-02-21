# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
## quick start
``` bash
git clone https://github.com/q1nghuan/Snapshot.git
cd MultiSnap-Editor
npm install
npm start
```

## 使用本地 socket 服务
如果不开启本地socket服务，只能实现同一浏览器标签页之间的协同编辑。


若要实现多浏览器之间的协同编辑，需要开启本地socket服务

在当前项目下启动 y-websocket 服务


如果当前项目已经安装 y-websocket 依赖，可直接使用


如果在别处启动时，需要先安装 y-websocket 依赖
``` bash
//安装y-websocket依赖
npm install y-websocket

// 开启本地socket服务
npx y-websocket PORT=1234
```

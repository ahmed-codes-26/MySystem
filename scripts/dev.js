import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['--watch-path=server/src','server/src/index.js'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','client/vite.config.js','--host','127.0.0.1','client'],{stdio:'inherit'})];
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{children.forEach(c=>c.kill());process.exit();});

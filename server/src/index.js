import {app} from './app.js';
import {connect} from './db.js';
import {config} from './config.js';
try {await connect();const server=app.listen(config.PORT,config.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1',()=>console.log(`MySystem API ready on port ${config.PORT}`));server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxRequestsPerSocket=1000;process.on('SIGTERM',()=>server.close(()=>process.exit(0)));} catch {console.error('Could not start the API. Check server configuration and database connectivity.');process.exit(1);}

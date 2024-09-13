var colors = require('colors');
const uuidv1 = require('uuid/v1');

const textFiles = ['.js', '.css'];
const imgFiles = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
const imgFilesType = { 
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
}

module.exports.start = function(server, port) {
	var io = require('socket.io')(server);
    
    const self = this;
	self.fyoClients = {};
    self.fyoServers = {};
    self.log = [];

    io.on('connection', function (client) {
        console.log(colors.green('[Connection]'), 'Socket connected via: ' + client.conn.transport.name);

        /*
        /   Game/App
        */
        client.on('fyo-server', function (data) {
            console.log('fyo-server', data);
            const fyoServerID = data;
            self.fyoServers[data] = client;
            
            client.on('SGRedirectMsg', (id, data) => {
                console.log('SGRedirectMsg', id, data);
                self.log.push({
                    dt: +new Date,
                    msg: `SGRedirectMsg|${id}|${data}`
                });
                if (id && self.fyoClients[id]) {
                    console.log('emit');
                    self.fyoClients[id].emit('SGRedirectMsg', data);
                } else {
                    console.log('did not find', id, self.fyoClients[id], self.fyoClients);
                }
            });
            client.on('app-ping', (id, data) => {
                if (id && self.fyoClients[id]) {
                    self.fyoClients[id].emit('app-ping', data);
                }
            });
            client.on('app-pong', (id, data) => {
                if (id && self.fyoClients[id]) {
                    self.fyoClients[id].emit('app-pong', data);
                }
            });
            client.on('info', (id, data) => {
                if (id && self.fyoClients[id]) {
                    self.fyoClients[id].emit('info', data);
                }
            });
            client.on('Games', (id, data) => {
                if (id && self.fyoClients[id]) {
                    self.fyoClients[id].emit('Games', data);
                }
            });
            client.on('SGUpdateMsg', (id, data) => {
                if (id && self.fyoClients[id]) {
                    if (data.MessageType && data.MessageType === 'Games' && data.data) {
                        // adjust urls
                        for(var i = 0; i < data.data.length; i++) {
                            data.data[i].imgURL = '/proxy/' + fyoServerID + data.data[i].imgURL;
                        }
                        self.fyoClients[id].emit('SGUpdateMsg', data);
                    } else {
                        self.fyoClients[id].emit('SGUpdateMsg', data);
                    }
                }
            });
        });


        client.on('fyo-client', function (deviceID) {
            client.deviceID = `${deviceID}`;
            client.socketId = uuidv1();
            self.fyoClients[client.socketId] = client;
			console.log('Client Setup', client.socketId);

            client.on('disconnect', () => {
				if (self.fyoServers[deviceID]) {
					self.fyoServers[deviceID].emit('Disconnect-Proxy', client.socketId);
				}
				console.log('removing client');
                if (self.fyoClients[client.socketId]) {
                    delete self.fyoClients[client.socketId];
                }
            });

            client.on('SGUpdateMsg', (msg) => {
                console.log('SGUpdateMsg', msg, deviceID);
				if (self.fyoServers[deviceID]) {
					self.fyoServers[deviceID].emit('SGUpdateMsg-Proxy', client.socketId, msg);
				}
            });

            client.on('Start', (msg) => {
                console.log('Start', msg, deviceID);
				if (self.fyoServers[deviceID]) {
					self.fyoServers[deviceID].emit('Start-Proxy', client.socketId, msg);
				}
            });

            client.on('SGHandshakeIdentMsg', (msg) => {
                console.log('SGHandshakeIdentMsg', deviceID);
				if (self.fyoServers[deviceID]) {
					self.fyoServers[deviceID].emit('SGHandshakeIdentMsg-Proxy', client.socketId, msg);
				}
            });
        });
    });
    

    this.send = (deviceID, res, route, next) => {
        console.log('get', route);
        if (self.fyoServers[deviceID]) {
            self.fyoServers[deviceID].emit('request', null, route, (data) => {
                console.log('Got req back');
                
                const lowerRoute = route.toLowerCase();
		let resTypeSet = false;
                textFiles.map((f) => {
                    if (lowerRoute.endsWith(f)) {
                        res.type(f);
		        resTypeSet = true;
                    }
                })
                imgFiles.map((f) => {
                    if (lowerRoute.endsWith(f)) {
                        res.type(imgFilesType[f]);
		    	resTypeSet = true;
                    }
                })
		if (!resTypeSet) {
			res.type('text/html');
		}
                res.send(data);
            });
        } else {
            next();
        }
    }

    return this;
};

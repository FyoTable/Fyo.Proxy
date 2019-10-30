var colors = require('colors');
const uuidv1 = require('uuid/v1');

const textFiles = ['.js', '.css'];

module.exports.start = function(server, port) {
	var io = require('socket.io')(server);
    
    const self = this;
	self.fyoClients = {};
    self.fyoServers = {};
    io.on('connection', function (client) {
        console.log(colors.green('[Connection]'), 'Socket connected via: ' + client.conn.transport.name);

        /*
        /   Game/App
        */
        client.on('fyo-server', function (data) {
            console.log('fyo-server', data);
            self.fyoServers[data] = client;
        });

        client.on('SGRedirectMsg', (id, data) => {
			console.log('SGRedirectMsg', id, data);
            if (id && self.fyoClients[id]) {
				console.log('emit');
                self.fyoClients[id].emit('SGRedirectMsg', 'proxy/' + self.fyoClients[id].deviceID + '/' + data + '/');
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
                textFiles.map((f) => {
                    if (lowerRoute.endsWith(f)) {
                        res.type(f);
                    }
                })
                res.send(data);
            });
        } else {
            next();
        }
    }

    return this;
};

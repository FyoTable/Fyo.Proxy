var colors = require('colors');
const uuidv1 = require('uuid/v1');

const textFiles = ['.js', '.css'];

module.exports.start = function(server, port) {
	var io = require('socket.io')(server);
    
    const self = this;
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

        client.on('fyo-client', function (deviceID) {
            client.deviceID = deviceID;
            client.socketId = uuidv1();

            client.on('disconnect', () => {
                self.fyoServers[deviceID].emit('Disconnect-Proxy', client.socketId);
            });

            client.on('SGUpdateMsg', (msg) => {
                console.log('SGUpdateMsg', msg, deviceID);
                self.fyoServers[deviceID].emit('SGUpdateMsg-Proxy', client.socketId, msg);
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

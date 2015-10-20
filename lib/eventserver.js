var iomod = require('socket.io');

// Websocket-based event delivery
// Gather endpoint interest from live sockets
// Send initial event history to new sockets
// Broadcast event updates to live sockets

module.exports = function(server, db) {
	var srv = {
		clients: {},

		onConnect: function(socket) {
			var self = srv;

			// Register socket
			self.clients[socket.id] = {
				endpoint: null,
				socket: socket
			};

			// Set up socket event few handlers

			socket.on('disconnect', function () {
				delete self.clients[socket.id];
			});

			socket.on('set endpoint', function (data) {
				var endpointid = data;

				if (!(socket.id in self.clients)) {
					socket.emit('error', {
						msg: 'Unregistered socket'
					});
					return;
				}

				db.getEndpointByID(endpointid, function (err, endpt) {
					if (err) {
						socket.emit('error', {
							msg: 'Unrecognised endpoint: ' + endpointid
						});
						return;
					}

					self.clients[socket.id].endpoint = endpointid;

					console.log(socket.id + ' => ' + endpointid);

					// Send initial event stream
					db.getEventsForEndpoint(endpointid, function(err, events) {
						socket.emit('events', events);
					});
				});
			});
		},

		endpointUpdated: function (endptid, newevents) {
			var self = this;

			var interested = Object.keys(self.clients).filter(function (clientkey) {
				return self.clients[clientkey].endpoint == endptid;
			});

			interested.forEach(function (clientkey) {
				self.clients[clientkey].socket.emit('events', newevents);
			});
		}
	};

	var io = iomod(server);
	io.on('connection', srv.onConnect);

	return srv;
};

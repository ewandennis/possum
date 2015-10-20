//
// Storage facade: accept and retrieve the latest N 'events' for a named set of 'endpoints'
//

module.exports = function() {
	return {
		MAX_EVENTS: 100,

		// endpoint: {name: <str>, events: <array>, id: <integer>}
		endpoints: [],

		// Register a new endpoint.
		// Returns: error if endpoint name already exists, new endpoint object otherwise
		addEndpoint: function(endptname, next) {
			var self = this;
			var exists = self.endpoints.filter(function (elt) {
				return elt.name == endptname; }
			).length > 0;

			if (!exists) {
				self.endpoints.push(self._mkEndpoint(endptname));
				next(null, self._pruneEndpoint(self.endpoints[self.endpoints.length - 1]));
			} else {
				next(true);
			}
		},

		// Returns: unordered array of endpoints sans events
		listEndpoints: function(next) {
			var self = this;
			if (next) {
				next(null, self.endpoints.map(function (elt) {
					return self._pruneEndpoint(elt);
				}));
			}
		},

		// Fetch an endpoint by ID
		// Returns: an endpoint sans events
		getEndpointByID: function (id, next) {
			var self = this;
			if (id < self.endpoints.length) {
				next(null, self._pruneEndpoint(self.endpoints[id]));
			} else {
				next(true);
			}
		},

		// Accepts: array of events for endpoint in ascending timestamp order
		// ASSUMPTION: each new event has strictly higher timestamp than any event already stored
		saveEventsForEndpoint: function(endptid, events, next) {
			var self = this;

			if (self.endpoints.length < endptid) {
				if (next) next(true);
				return;
			}

			// Append events
			var storedevts = self.endpoints[endptid].events;
			if (events.length > self.MAX_EVENTS) {
				// New events alone are more than we can store.  Store a subset
				// of the newest events, overwriting the stored array.
				self.endpoints[endptid].events = events.slice(events.length - self.MAX_EVENTS);
			} else if (storedevts.length + events.length > self.MAX_EVENTS) {
					// New events would take us over the limit.
					// Shed some old events from the start of the stored array
					// to make space for the new ones.
					var slice = storedevts.slice(events.length);
					storedevts = self.endpoints[endptid].events = slice;
					Array.prototype.push.apply(storedevts, events);
			} else {
				// We have storage for the new events so just append them
				Array.prototype.push.apply(storedevts, events);
			}

			if (next) {
				next();
			}
		},

		// Returns: array of events for endpoint in ascending timestamp order
		getEventsForEndpoint: function(endptid, next) {
			var self = this;
			if (endptid < self.endpoints.length) {
				next(null, self.endpoints[endptid].events);
			} else {
				next(true);
			}
		},

		_mkEndpoint: function(name) {
			var self = this;
			return {
					id: self.endpoints.length,
					events: [],
					name: name
			};
		},

		_pruneEndpoint: function(ep) {
			return {
				id: ep.id,
				name: ep.name,
				cnt: ep.events.length
			};
		}
	};
};

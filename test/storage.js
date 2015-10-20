// storage test
var storage = require('../lib/storage')
  , testevents = require('../testevents')
  , assert = require('assert');

function log(msg) {
	console.log(msg);
}

// should retain endpoints explicitly added to it
function retainExplicitEndptNames(next) {
	var db = storage()
		, endpt1name = 'endpoint1';

	log('retainExplicitEndptNames');

	db.addEndpoint(endpt1name, function (err, obj) {
		var expectedobj = {
			name: endpt1name,
			id: 0,
			cnt: 0
		};

		assert.equal(err, null);

		assert.deepEqual(obj, expectedobj);

		db.listEndpoints(function (err, endpts) {
			assert.deepEqual(endpts, [expectedobj]);
			next();
		});
	});
}

function retrieveEndpointByID(next) {
	var db = storage()
		, endpt1name = 'endpoint1';

	log('retrieveEndpointByID');

	db.addEndpoint(endpt1name, function (err, obj) {
		var expectedobj = {
			name: endpt1name,
			id: 0,
			cnt: 0
		};

		assert.equal(err, null);

		assert.deepEqual(obj, expectedobj);

		db.getEndpointByID(obj.id, function (err, endpt) {
			assert.equal(err, null);
			assert.deepEqual(endpt, obj);
		});
		next();
	});
}

// should retain events for a given endpoint
function retainEvents(next) {
	var db = storage()
		, endpt1name = 'endpoint1';

	log('retainEvents');

	db.addEndpoint(endpt1name, function (err, obj) {
		assert.equal(err, null);
		db.saveEventsForEndpoint(obj.id, testevents, function (err) {
			assert.equal(err, null);
			db.getEventsForEndpoint(obj.id, function (err, retrieved) {
				assert.equal(err, null);
				assert.deepEqual(testevents, retrieved);
				next();
			});
		});
	});
}

// should retain only MAX_EVENTS events per endpoint
function retainJustEnoughEvents(next) {
	var db = storage()
		, endpt1name = 'endpoint1'
		, events = [];

	log('retainJustEnoughEvents');

	for (var i = 0; i < db.MAX_EVENTS; i += testevents.length) {
		Array.prototype.push.apply(events, testevents);
	}

	db.addEndpoint(endpt1name, function (err, obj) {
		assert.equal(err, null);
		db.saveEventsForEndpoint(obj.id, events, function (err) {
			db.saveEventsForEndpoint(obj.id, testevents, function (err) {
				db.getEventsForEndpoint(obj.id, function(err, events) {
					assert.equal(events.length, db.MAX_EVENTS);
					next();
				});
			});
		});
	});
}

// should throw away old events in favour of new
function dropOldEvents(next) {
	var db = storage()
		, endpt1name = 'endpoint1'
		, events = [];

	log('dropOldEvents');

	for (var i = 0; i <= db.MAX_EVENTS; ++i) {
		var testevt = {
			msys: { message_event: { timestamp: i } }
		};
		events.push(testevt);
	}

	db.addEndpoint(endpt1name, function (err, obj) {
		assert.equal(err, null);
		db.saveEventsForEndpoint(obj.id, events, function (err) {
			db.getEventsForEndpoint(obj.id, function (err, events) {
				assert.equal(events[0].msys.message_event.timestamp, 1);
				next();
			});
		});
	});
}

// Run em
retainExplicitEndptNames(function() {
	retrieveEndpointByID(function () {
		retainEvents(function() {
			retainJustEnoughEvents(function() {
				dropOldEvents(function() {
					console.log('done');
				});
			});
		});
	});
});

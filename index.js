// Possum entry point

var express = require('express')
 , bodyParser = require('body-parser')
 , app = express()
 , storage = require('./lib/storage')
 , db = storage()
 , srv = require('http').Server(app)
 , eventsrv = require('./lib/eventserver')(srv, db);

// set

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// use

app.use('/css', express.static(__dirname + '/static/css'));
app.use('/bower_components', express.static(__dirname + '/bower_components/'));
app.use('/js', express.static(__dirname + '/static/js'));

app.use(bodyParser.json());

// UI route

app.get('/', function (req, res) {
	res.render('page.jade', {});
});

// service API endpoints

// list endpoints
app.get('/endpoints', function (req, res) {
	db.listEndpoints(function (err, endpts) {
		if (err) {
			res.json({ok: false});
		} else {
			res.json({ok: true, endpoints: endpts});
		}
	});
});

// create an endpoint
app.post('/endpoints', function (req, res) {
	db.addEndpoint(req.body.endpointname, function (err, obj) {
		if (err) {
			res.json({ok: false});
		} else {
			res.json({ok: true, endpoint: obj});
		}
	});
});

app.param('endpoint', function (req, res, next, endpointid) {
	db.getEndpointByID(endpointid, function (err, obj) {
		if (err) {
			next(err);
			return;
		}

		req.endpoint = obj;
		next();
	});
});

// get endpoint details
app.get('/endpoints/:endpoint', function (req, res) {
	res.json({ok: true, endpoint: req.endpoint});
});

// add events to an endpoint
app.post('/endpoints/:endpoint', function(req, res) {
	var events = req.body;

	// Store new events
	db.saveEventsForEndpoint(req.params.endpoint, events, function (err) {
		if (err) {
			// TODO: meaningful error messages in both HTTP and REST layers
			res.status(500).send('Internal error');
		} else {
			res.json({ok:true});

			// Update connected clients
			eventsrv.endpointUpdated(req.params.endpoint, events);
		}
	});
});

srv.listen(3000);

// ----------------------------------------------------------------------------
//
// Credentials page: #creds
//

$(document).on('pagecreate', '#creds', function() {
	// TODO: Check for pre-existing session and navigate
	// straight to #endpoints

  // Register validation for the credentials form
	$('#credsfrm').validate({
		messages: {
			email: {
				required: 'Please enter your email address',
				email: 'Email addresses usually look like this: name@domain.com'
			}
		},
		errorPlacement: function (err, elt) {
			err.appendTo(elt.parent().prev());
		},
		submitHandler: function (frm) {
      // On submit, navigate to the 'next' page: #endpoints
			// TODO: notify backend of user access
			// TODO: store session?
			location.hash = 'endpoints';
			return false;
		}
	});
});

// ----------------------------------------------------------------------------
//
// Endpoints page: #endpoints
//

function goToEventsPage(_endpoint) {
  localStorage.setItem('endpoint.name', _endpoint.name);
  localStorage.setItem('endpoint.id', _endpoint.id);
  location.hash = 'events';
}

// FIXME: crap error message placement
function showError(msg) {
  $('#newendpointfrm').parent().append(msg);
}

$(document).on('pagecreate', '#endpoints', function() {
  // Register validation for the 'create new endpoint' form
	$('#newendpointfrm').validate({
		messages: {
		},
		errorPlacement: function (err, elt) {
			showError(err);
		},
		submitHandler: function (frm) {
      var endpointname = $('#endpointnamefld').val();
      $.ajax({
        type: 'POST',
        url: '/endpoints',
        data: JSON.stringify({ endpointname: endpointname }),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function(data, status, jqXHR) {
          if (!data.ok) {
            showError('Endpoint exists with that name');
          } else {
            populateEndpointsList();
          }
        },
        error: function(jqXHR, status) {
          showError(JSON.stringify(status));
        }
      });
		}
	});

  $(this).bind('pagebeforeshow', onShowEndpoints);
});

function onShowEndpoints() {
  // Initial list population
	populateEndpointsList();
}

function populateEndpointsList() {
  var loc = $(location);
  var urlbase = getServerURL();
  $.ajax({
    type: 'GET',
    url: '/endpoints',
    dataType: 'json',
    success: function (data, status, jqXHR) {
      if (!data.ok) {
        // TODO
        return;
      }

      var eplst = $('#endpointlst');
      eplst.empty();

      data.endpoints.forEach(function(ep) {
        var li = '<li><a href="#">' +
          '<h3>' + ep.name + '</h3>' +
          '<span class="ui-li-count">' + ep.cnt + '</span>' +
          '<p class="ui-li-desc">' + urlbase + '/endpoints/' + ep.id +
          '</p></a></li>';

        var lielt = $(li);
        lielt.click(function () {
          goToEventsPage(ep);
        });
        eplst.append(lielt);
      });

      eplst.listview('refresh');
    },
    error: function (jqXHR, status) {
      // TODO
    }
  });
}

// ----------------------------------------------------------------------------
// Events page: #events
//

var socket = null;

$(document).on('pagecreate', '#events', function() {
  // Tie the 'Message events' checkbox to all sub checkboxes
  $('#msgchk').change(function () {
    checkem('#msgchk', ['#receptionchk', '#delaychk', '#deliverychk',
      '#inbandchk', '#bouncechk']);
  });

  // TODO: Tie the 'Generation events' checkbox to all sub checkboxes
  $('#genchk').change(function () {
   checkem('#genchk', ['#genfailchk', '#genrejectchk']);
  });

  // Tie the 'Engagement events' checkbox to all sub checkboxes
  $('#engchk').change(function () {
    checkem('#engchk', ['#openchk', '#clickchk']);
  });

  $(this).bind('pagebeforeshow', onShowEvents);
});

function onShowEvents() {
  var endpointName = localStorage.getItem('endpoint.name');
  var endpointID = localStorage.getItem('endpoint.id');
  $('#endpointnametitle').html(endpointName);
  $('#endpointurl').html(getServerURL() + '/endpoints/' + endpointID);

  if (!socket) {
    socket = io($(location).attr('host'));

    socket.on('events', function (events) {
      populateEventsList(events);
    });
  }

  socket.emit('set endpoint', endpointID);
}

function checkem(parent, lst) {
	var parentobj = $(parent);
	lst.forEach(function (chk) {
		var chkobj = $(chk);
		chkobj.prop('checked', parentobj.prop('checked'));
		chkobj.checkboxradio('refresh');
	});
}

//
// Events are added as LI's to an UL element.
// Formatters for each event type are stored in eventformatters, keyed by type.
//

function populateEventsList(events) {
	// TODO: load events list

	var evlst = $('#eventlst');
	evlst.empty();

	events.forEach(function(evt) {
		var rec = evt.msys;
		var typekeys = ['message_event', 'gen_event', 'track_event'];
		var type = typekeys.filter(function (key) { return key in rec; });

		if (type.length === 0) {
			console.log('Error: unexpected event structure: ' + rec);
			return;
		}

		rec = rec[type[0]];

		// rec.timestamp = moment.unix(rec.timestamp).format('YYYY-MM-DD HH:mm:ss');
		rec.timestamp = moment.unix(rec.timestamp).fromNow();

		var li = '<li><span class="evttype">' + rec.type + ' </span>' +
			eventformatters[rec.type](rec) + '</li>';
		evlst.append(li);
	});

	evlst.listview('refresh');
}

var eventformatters = {
	reception: function(e) {
		return '<span class="ui-li-desc">for ' + e.rcpt_to + '</span>' +
			'<span class="ui-li-count">' + e.timestamp + '</span>';
	},

	delay: function(e) {
		return '';
	},

	delivery: function(e) {
		return '<span class="ui-li-desc">to ' + e.routing_domain + '</span>' +
			'<span class="ui-li-count">' + e.timestamp + '</span>';
	},

	inband: function(e) {
		return '<span class="ul-li-desc">from ' + e.rcpt_to + '</span>' +
			'<span class="ui-li-count">' + e.timestamp + '</span>';
	},

	bounce: function(e) {
		return '';
	},

	open: function(e) {
		var parser = new UAParser();
		parser.setUA(e.user_agent);
		var ua = parser.getResult();

		return '<span class="ui-li-desc">' + ua.os.name + ' - ' + ua.device.model + '</span>' +
			'<span class="ui-li-count">' + e.timestamp + '</span>';
	},

	click: function(e) {
		return '<span class="ui-li-desc">' + e.target_link_url + '</span>' +
			'<span class="ui-li-count">' + e.timestamp + '</span>';
	},

	// gen fail
	fail: function(e) {
		return '<span class="ui-li-desc">' + e.reason + '</span>' +
			'<span class="ui-li-count">' + e.timestamp + '</span>';
	}
	// TODO: missing event types: policy rejection, spam complaint,
	// generation rejection
};

// ----------------------------------------------------------------------------

function getServerURL() {
  var loc = $(location);
  return loc.attr('protocol') + '://' + loc.attr('host');
}

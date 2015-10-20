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

    if (eventformatters.hasOwnProperty(rec.type)) {
  		var li = '<li><span class="ui-li-desc"><span class="evttype">' + rec.type + ' </span><span class="eventdesc">' +
  			eventformatters[rec.type](rec) + '</span></span><span class="ui-li-count">' + rec.timestamp + '</span></li>';
  		evlst.append(li);
    }
	});

	evlst.listview('refresh');
}

// ----------------------------------------------------------------------------

// evt.fld -> <span class="fld">evt.fld</span>
function spanclass(evt, fld) {
  return '<span class="' + fld + '">' + evt[fld] + '</span>';
}

var eventformatters = {
	// injection: function(e) {
	// 	return 'Received <span class="subject">&quot;' + e.subject + '&quot;</span> addressed to ' + e.rcpt_to;
	// },

	// delay: function(e) {
	// 	return 'Delays delays...';
	// },

	delivery: function(e) {
		return spanclass(e, 'subject') + ' was sent to ' + spanclass(e, 'rcpt_to');
	},

	bounce: function(e) {
		return spanclass(e, 'rcpt_to') + ' did not receive ' + spanclass(e, 'subject') + '.  SparkPost says ' + spanclass(e, 'reason');
	},

	// out_of_band: function(e) {
 //    return spanclass(e, 'rcpt_to') + ' did not receive message with ID ' + e.message_id + '</span> due to ' + spanclass(e, 'reason');
	// },

  spam_complaint: function(e) {
    return spanclass(e, 'rcpt_to') + ' complained about ' + spanclass(e, 'subject') + ' according to ' + e.report_by;
  },

  policy_rejection: function(e) {
    return 'SparkPost rejected a message from ' + spanclass(e, 'campaign_id') + '. SparkPost says ' + spanclass(e, 'reason');
  },

	open: function(e) {
		var parser = new UAParser();
		parser.setUA(e.user_agent);
		var ua = parser.getResult();

		return spanclass(e, 'rcpt_to') + ' opened an email on a <span class="device">' + ua.os.name + '</span> device while visiting <span class="location">' + e.geo_ip.city + '</span>';
	},

	click: function(e) {
    var parser = new UAParser();
    parser.setUA(e.user_agent);
    var ua = parser.getResult();
		return spanclass(e, 'rcpt_to') + ' clicked on <a href="' + e.target_link_url + '">' + e.target_link_url + '</a> on a <span class="device">' + ua.os.name + '</span> device while visiting <span class="location">' + e.geo_ip.city + '</span>';
	},

	// generation_failure: function(e) {
	// 	return '<span class="ui-li-desc">' + spanclass(e, 'reason') + '</span>' +
	// 		'<span class="ui-li-count">' + e.timestamp + '</span>';
	// },

 //  generation_rejection: function(e) {
 //    return '<span class="ui-li-desc">' + spanclass(e, 'reason') + '</span>' +
 //      '<span class="ui-li-count">' + e.timestamp + '</span>';
 //  },

  list_unsubscribe: function(e) {
    return spanclass(e, 'rcpt_to') + ' unsubscribed from your mail';
  },

  link_unsubscribe: function(e) {
    return spanclass(e, 'rcpt_to') + ' unsubscribed from your mail';
  }
};

// ----------------------------------------------------------------------------

function getServerURL() {
  var loc = $(location);
  return loc.attr('protocol') + '://' + loc.attr('host');
}

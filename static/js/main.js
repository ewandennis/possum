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

var eventFilterCheckGroups = {
  '#msgchk': {
    '#receptionchk': 'injection',
    '#rejectionchk': 'policy_rejection',
    '#delaychk': 'delay',
    '#deliverychk': 'delivery',
    '#inbandchk': 'bounce',
    '#bouncechk': 'out_of_band',
    '#spamchk': 'spam_complaint'
  },
  '#genchk': {
    '#genfailchk': 'generation_failure',
    '#genrejectchk': 'generation_rejection'
  },
  '#engchk': {
    '#openchk': 'open',
    '#clickchk': 'click'
  },
  '#unsubschk': {
    '#listunsubschk': 'list_unsubscribe',
    '#linkunsubschk': 'link_unsubscribe'
  }
};

var allEventTypes = Array.prototype.concat.apply([], 
  Object.keys(eventFilterCheckGroups).map(function(groupName) {
    var group = eventFilterCheckGroups[groupName];
    return Object.keys(group).map(function(chkboxname) { return group[chkboxname]; });
  }));

$(document).on('pagecreate', '#events', function() {

  // Show everything to start with
  var enabledTypes = allEventTypes;

  function setEnabledTypes(evttypes, onoff) {
    if (onoff) {
      var missingTypes = evttypes.filter(function(evttype) {
        return enabledTypes.indexOf(evttype) < 0;
      });
      enabledTypes = enabledTypes.concat(missingTypes);
    } else {
      enabledTypes = enabledTypes.filter(function(evttype) {
        return evttypes.indexOf(evttype) < 0;
      });
    }
    filterEventsList(enabledTypes);
  }

  function enableType(evttype, onoff) {
    if (onoff) {
      if (enabledTypes.indexOf(evttype) < 0) {
        enabledTypes.push(evttype);
      }
    } else {
      enabledTypes = enabledTypes.filter(function(elt) {
        return elt !== evttype;
      });
    }
    filterEventsList(enabledTypes);
  }

  function addCheckboxChangeHandler(chksel, evttype) {
    $(chksel).change(function() {
      var checked = $(chksel).prop('checked');
      enableType(evttype, checked);
    });
  }

  // Tie the event group checkboxes to their sub checkboxes
  // Update event filters on checkbox change events
  Object.keys(eventFilterCheckGroups).forEach(function(groupCheckboxName) {
    var checkboxGroup = eventFilterCheckGroups[groupCheckboxName];
    var groupCheckboxes = Object.keys(checkboxGroup);

    $(groupCheckboxName).change(function() {
      checkem(groupCheckboxName, groupCheckboxes);
      var checked = $(groupCheckboxName).prop('checked');
      var groupTypes = groupCheckboxes.map(function(chkboxName) { return checkboxGroup[chkboxName]; });
      setEnabledTypes(groupTypes, checked);
    });

    groupCheckboxes.forEach(function(chkboxName) {
      addCheckboxChangeHandler(chkboxName, checkboxGroup[chkboxName]);
    });
  });

  $(this).bind('pagebeforeshow', onShowEvents);
});

function filterEventsList(enabledTypes) {
  $('#eventlst LI').each(function(idx) {
    var elt = $(this)
      , eventtype = elt.data('eventtype');

    if (enabledTypes.indexOf(eventtype) >= 0) {
      elt.removeClass('ui-screen-hidden');
    } else {
      elt.addClass('ui-screen-hidden');
    }
 });

  $('#eventlst').listview('refresh');
}

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
	var evlst = $('#eventlst')
    , unpackedEvents = events.map(function(evt) {
      return evt.msys[Object.keys(evt.msys)[0]];
    })
    , goodEvents = unpackedEvents.filter(function(evt) {
      return allEventTypes.indexOf(evt.type) >= 0;
    });

	goodEvents.forEach(function(evt) {
		evt.timestamp = moment.unix(evt.timestamp).fromNow();

    if (eventformatters.hasOwnProperty(evt.type)) {
  		var li = $('<li><span class="ui-li-desc"><span class="evttype">' + evt.type + ' </span><span class="eventdesc">' +
  			eventformatters[evt.type](evt) + '</span></span><span class="ui-li-count">' + evt.timestamp + '</span></li>');

      li.data('eventtype', evt.type);

  		evlst.prepend(li);
    }
	});

	evlst.listview('refresh');
}

// ----------------------------------------------------------------------------
// Events page event rendering

// evt.fld -> <span class="fld">evt.fld</span>
function spanclass(evt, fld) {
  return '<span class="' + fld + '">' + evt[fld] + '</span>';
}

var eventformatters = {
	injection: function(e) {
		return 'Received ' + spanclass(e, 'subject') + ' addressed to ' + e.rcpt_to;
	},

	delay: function(e) {
		return 'Delays delays...';
	},

	delivery: function(e) {
		return spanclass(e, 'subject') + ' was sent to ' + spanclass(e, 'rcpt_to');
	},

	bounce: function(e) {
		return spanclass(e, 'rcpt_to') + ' did not receive ' + spanclass(e, 'subject') + '.  SparkPost says ' + spanclass(e, 'reason');
	},

	out_of_band: function(e) {
    return spanclass(e, 'rcpt_to') + ' did not receive message with ID ' + e.message_id + '</span> due to ' + spanclass(e, 'reason');
	},

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

	generation_failure: function(e) {
		return spanclass(e, 'reason');
	},

  generation_rejection: function(e) {
    return spanclass(e, 'reason');
  },

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

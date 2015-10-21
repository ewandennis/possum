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
      populateEventsList($('#eventlst'), events);
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

// ----------------------------------------------------------------------------

function getServerURL() {
  var loc = $(location);
  return loc.attr('protocol') + '://' + loc.attr('host');
}

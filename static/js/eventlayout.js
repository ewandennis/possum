// ----------------------------------------------------------------------------
// Format incoming SparkPost events as LI HTML elements in a JQuery Mobile
// listview.
//
// Events are added as LI's to an UL element.
// Formatters for each event type are stored in eventformatters, keyed by type.
//

function populateEventsList(eventlistview, events) {
  var unpackedEvents = events.map(function(evt) {
      return evt.msys[Object.keys(evt.msys)[0]];
    })
    , goodEvents = unpackedEvents.filter(function(evt) {
      return evt === undefined || allEventTypes.indexOf(evt.type) >= 0;
    });

  goodEvents.forEach(function(evt) {
    var li;

    if (evt !== undefined) {
      evt.timestamp = moment.unix(evt.timestamp).fromNow();

      if (eventformatters.hasOwnProperty(evt.type)) {
        li = $('<li><span class="ui-li-desc"><span class="evttype">' + evt.type + ' </span><span class="eventdesc">' +
          eventformatters[evt.type](evt) + '</span></span><span class="ui-li-count">' + evt.timestamp + '</span></li>');
      }
      li.data('eventtype', evt.type);
    } else {
      // webhook pings are empty events which show up as undefined entries here
      li = $('<li><span class="ui-li-desc"><span class="ping">Webhook endpoint ping</span></span></li>');
      li.data('eventtype', 'ping');
    }

    eventlistview.prepend(li);
  });

  eventlistview.listview('refresh');
}

// ----------------------------------------------------------------------------
// Events page event rendering

function subjectOrCampaignID(evt) {
  if (evt.subject) return 'subject';
  return 'campaign_id';
}

function geolocation(evt, prefix, suffix) {
  if (evt.geo_ip) {
    return prefix + evt.geo_ip.city + suffix;
  }
  return '';
}

// evt.fld -> <span class="fld">evt.fld</span>
function spanclass(evt, fld) {
  return '<span class="' + fld + '">' + evt[fld] + '</span>';
}

var eventformatters = {
  injection: function(e) {
    return 'Received ' + spanclass(e, subjectOrCampaignID(e)) + ' addressed to ' + e.rcpt_to;
  },

  delay: function(e) {
    return 'Delays delays...';
  },

  delivery: function(e) {
    return spanclass(e, subjectOrCampaignID(e)) + ' was sent to ' + spanclass(e, 'rcpt_to');
  },

  bounce: function(e) {
    return spanclass(e, 'rcpt_to') + ' did not receive ' + spanclass(e, subjectOrCampaignID(e)) + '.  SparkPost says ' + spanclass(e, 'reason');
  },

  out_of_band: function(e) {
    return spanclass(e, 'rcpt_to') + ' did not receive message with ID ' + e.message_id + '</span> due to ' + spanclass(e, 'reason');
  },

  spam_complaint: function(e) {
    return spanclass(e, 'rcpt_to') + ' complained about ' + spanclass(e, subjectOrCampaignID(e)) + ' according to ' + e.report_by;
  },

  policy_rejection: function(e) {
    return 'SparkPost rejected a message from ' + spanclass(e, 'campaign_id') + '. SparkPost says ' + spanclass(e, 'reason');
  },

  open: function(e) {
    var parser = new UAParser();
    parser.setUA(e.user_agent);
    var ua = parser.getResult();
    return spanclass(e, 'rcpt_to') + ' opened an email on a <span class="device">' + ua.os.name + '</span> device' + geolocation(e, ' while visiting <span class="location">', '</span>');
  },

  click: function(e) {
    var parser = new UAParser();
    parser.setUA(e.user_agent);
    var ua = parser.getResult();
    return spanclass(e, 'rcpt_to') + ' clicked on <a href="' + e.target_link_url + '">' + e.target_link_url + '</a> on a <span class="device">' + ua.os.name + '</span> device' + geolocation(e, ' while visiting <span class="location">', '</span>');
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

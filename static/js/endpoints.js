// ----------------------------------------------------------------------------
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

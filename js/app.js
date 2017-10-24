
/************************ OUR MODEL ************************/

var Model = {
  // An array of markers
  markers: [],
  // The neighborhood map
  map: '',
  // The InfoWindow Content
  infoWindowContent: [],
  // The neighborhood locations
  locations: [
    {title: 'Kingdom Centre', location: {lat: 24.711310, lng: 46.674448}, marker: {}},
    {title: 'Paris Gallery', location: {lat: 24.706469, lng: 46.678320}, marker: {}},
    {title: 'Al Faisaliyah Center', location: {lat: 24.690278, lng: 46.685278}, marker: {}},
    {title: 'Al-Rajhi Bank', location: {lat: 24.707705, lng: 46.687085}, marker: {}},
    {title: 'Shawarma House', location: {lat: 24.708509, lng: 46.687464}, marker: {}},
    {title: 'Jarir Bookstore', location: {lat: 24.693805, lng: 46.670121}, marker: {}},
    {title: 'Danube Company', location: {lat: 24.693067, lng: 46.668449}, marker: {}},
    {title: 'Shake Shack', location: {lat: 24.689360, lng: 46.673687}, marker: {}},
    {title: 'Fuddruckers', location: {lat: 24.688878, lng: 46.673829}, marker: {}},
    {title: 'Narcissus Hotel and Residence Riyadh', location: {lat: 24.696040, lng: 46.683570}, marker: {}},
    {title: 'Aramex', location: {lat: 24.708839, lng: 46.689100}, marker: {}}
  ],
  // Total of neighborhood locations
  locationsTotal: 11,
  // Is sidebar shown?
  sidebar: false
};

/************************ OUR VIEW MODEL ************************/

var ViewModel = function() {
  // Saving (this) pointing state
  self = this;

  // A new observable for the filtering input text
  this.filterInput = ko.observable('');

  // Initialization of the neighborhood map
  self.init = function() {
    // Creating the neighborhood map
    Model.map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 24.704563, lng: 46.676634},
      zoom: 14
    });

    // Creating an InfoWindow object
    var myInfoWindow = new google.maps.InfoWindow();
    // Creating bounds object
    var bounds = new google.maps.LatLngBounds();

    // Looping through the neighborhood locations array to create an array of markers
    for (var i = 0; i < Model.locations.length; i++) {

      var position = Model.locations[i].location;
      var title = Model.locations[i].title;

      // Creating a marker
      var marker = new google.maps.Marker({
        map: Model.map,
        position: position,
        title: title,
        animation: google.maps.Animation.DROP,
        id: i
      });

      // Pushing the marker into the locations array
      Model.locations[i].marker = marker;

      // Getting Wikipedia info. for current location
      this.wikiInfo(i);

      // Listening to clicks on the marker
      /* jshint loopfunc: true */
      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          // Creating InfoWindow
          myInfoWindow.setContent(Model.locations[i].title);
          myInfoWindow.open(map, marker);
          // Animating marker
          self.animateMarker(marker);
          // Showing Wikipedia info. for current location
          self.showHideWiki(i);
          // Notifying the user that Wikipedia info. is on sidebar
          $('#footer').css('opacity', '100');
          $('#hamburger-button').css('background-color', 'lightpink');
          setTimeout(function() {
            $('#footer').transition({ opacity: 0 });
            $('#hamburger-button').css('background-color', 'transparent');
          }, 2000);
        };
      })(marker, i));

      // Extending map to show current marker
      bounds.extend(Model.locations[i].marker.position);
    }
    // Extending map to show all markers
    Model.map.fitBounds(bounds);
  };

  // A function to get Wikipedia info. for current location
  this.wikiInfo = function(i) {
    // The Wikipedia info. content
    var content = '';
    // The Wikipedia web service URL
    var wikiURL = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' + Model.locations[i].title + '&format=json&callback=wikiCallback';
    // Getting the Wikipedia info. using AJAX request
    $.ajax({
      url: wikiURL,
      dataType: 'jsonp',
      success: function(response) {
        var wTitle = response[0];
        var wLinks = response[1];
        var wSynopsis = response[2];
        var linksContent = '';
        for (var link=0; link<wLinks.length; link++) {
          var url = 'https://en.wikipedia.org/wiki/' + wLinks[link];
          linksContent += '<li>' + '<a href="' + url + '">' + wLinks[link] + '</a></li>';
        }
        content = '<div id="info-content-' + i + '" style="display: none">' +
                  '<h2 id="title" class="info-title">' + wTitle + '</h1>' +
                  '<div id="info-body">';
            content += wSynopsis.length > 0 ? wSynopsis : 'No Description!';
            content += wLinks.length > 0 ? '<ul id="wiki">'+ linksContent +'</ul>' : '';
            content += '</div></div>';
        var infoContent = $('#wikipedia').append(content);
      }
    })
    // In case the AJAX didn't work well
    .fail(function() {
      $('#wikipedia').text('Error: Cannot load Wikipedia data!');
    });
  };

  // A function to link sidebar locations list with Wikipedia info.
  this.linkWiki = function(selected) {
    // Remove the initial Wikipedia placeholder
    $('#wikiEmpty').text('');
    // looping into all locations
    Model.locations.forEach(function(loc, index) {
      // If this is the selected location
      if (loc.title === selected.title) {
        // Showing only current location Wikipedia info.
        $('#info-content-' + index).show('slow');
        // Animating the marker when clicked on the corresponding list item
        self.animateMarker(loc.marker);
      } else {
        // Hiding all other locations' Wikipedia info.
        $('#info-content-' + index).hide();
      }
    });
  };

  // A function to show Wikipedia info. for current location
  this.showHideWiki = function(cur) {
    // Remove the initial Wikipedia placeholder
    $('#wikiEmpty').text('');
    // Hiding all locations' Wikipedia info.
    for (var i=0; i<Model.locationsTotal; i++) {
      $('#info-content-' + i).hide();
    }
    // Showing only current location Wikipedia info.
    $('#info-content-' + cur).show('slow');
  };

  // A function to animate the marker
  this.animateMarker = function(marker) {
    if (marker.getAnimation()) {
      marker.setAnimation(null);
    } else {
      marker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(function() {
        marker.setAnimation(null);
      }, 1400);
    }
  };

  // A computed observable to filter sidebar locations list depending on user input
  this.filtered = ko.computed(function() {
    // Filtering the array
    this.filteredLocations = ko.utils.arrayFilter(Model.locations, function(loc) {
      // Getting filter keystrokes
      var filter = self.filterInput().toLowerCase();
      // Getting location title
      var locTitle = loc.title.toLowerCase();
      // The filter chars must be less than location chars
      if (filter.length > locTitle.length)
        return false;
      // Checking the filter match and return the result
      //loc.marker.setVisible(false);
      return locTitle.substring(0, filter.length) === filter;
    });
    // Return the filtered locations list
    return this.filteredLocations;
  }, this);

  // Listening to keystrokes to filter markers depending on user input
  document.getElementById("filter-input").addEventListener('keyup', function () {
    // Initializing the filtering state
    this.filteredMarker = false;
    // Filtering the array
    this.filteredLocs = ko.utils.arrayFilter(Model.locations, function(loc) {
      // Getting filter keystrokes
      var filter = self.filterInput().toLowerCase();
      // Getting location title
      var locTitle = loc.title.toLowerCase();
      // The filter chars must be less than location chars
      if (filter.length > locTitle.length)
        this.filteredMarker = false;
      // Checking the filter match and return the result
      else
        this.filteredMarker = locTitle.substring(0, filter.length) === filter;
      // Showing/Hiding the marker
      loc.marker.setVisible(this.filteredMarker);
    });
  });

  // Listening to sidebar icon click
  $('#hamburger-button').click( function() {
    // If sidebar is open
    if (Model.sidebar) {
      // Close it
      $('#hamburger-button').transition({ perspective: '100px', rotateY: '180deg' });
      $('#sidebar').transition({ x: '-300px' });
      Model.sidebar = false;
    // If sidebar is closed
    } else {
      // Open it
      $('#hamburger-button').transition({ perspective: '100px', rotateY: '-180deg' });
      $('#sidebar').transition({ x: '0' });
      Model.sidebar = true;
    }
  });

  // Listening to Google Map loading errors
  document.getElementById('map').addEventListener('error', mapError);

};

/************************ GLOBAL FUNCTIONS ************************/

// A function to load a location and get its title
var aLocation = function(data) {
  this.name = ko.observable(data.title);
};

// A function to initialize the map and apply bindings
function initMap() {
  var vm = new ViewModel();
  ko.applyBindings(vm);
  vm.init();
}

// A function to catch Google Map authentication errors
gm_authFailure = function() {
  alert('Error: Cannot load Google Maps data!');
};

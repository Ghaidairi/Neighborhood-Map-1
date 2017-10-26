
/************************ GLOBALS ************************/

// A global variable to store InfoWindow object
var myInfoWindow;

// A function to catch Google Map authentication errors
gm_authFailure = function() {
  alert('Error: Cannot load Google Maps data!');
};

// Initialization of the neighborhood map
var init = function() {
  // Apply Bindings to ViewModel
  ko.applyBindings(new ViewModel());
};


/************************ OUR MODEL ************************/

var Model = {
  // An array of markers
  markers: [],
  // The neighborhood map
  map: '',
  // The neighborhood locations
  locations: [
    {id: 0, title: 'Kingdom Centre', location: {lat: 24.711310, lng: 46.674448}, marker: {}},
    {id: 1, title: 'Paris Gallery', location: {lat: 24.706469, lng: 46.678320}, marker: {}},
    {id: 2, title: 'Al Faisaliyah Center', location: {lat: 24.690278, lng: 46.685278}, marker: {}},
    {id: 3, title: 'Al-Rajhi Bank', location: {lat: 24.707705, lng: 46.687085}, marker: {}},
    {id: 4, title: 'Shawarma House', location: {lat: 24.708509, lng: 46.687464}, marker: {}},
    {id: 5, title: 'Jarir Bookstore', location: {lat: 24.693805, lng: 46.670121}, marker: {}},
    {id: 6, title: 'Danube Company', location: {lat: 24.693067, lng: 46.668449}, marker: {}},
    {id: 7, title: 'Shake Shack', location: {lat: 24.689360, lng: 46.673687}, marker: {}},
    {id: 8, title: 'Fuddruckers', location: {lat: 24.688878, lng: 46.673829}, marker: {}},
    {id: 9, title: 'Narcissus Hotel and Residence Riyadh', location: {lat: 24.696040, lng: 46.683570}, marker: {}},
    {id: 10, title: 'Aramex', location: {lat: 24.708839, lng: 46.689100}, marker: {}}
  ],
  // Is sidebar shown?
  sidebar: false,
  // Current selected marker
  currentMarker: 0
};

/************************ OUR VIEW MODEL ************************/

var ViewModel = function() {
  // Saving (this) pointing state
  self = this;

  // Creating the neighborhood map
  Model.map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 24.704563, lng: 46.676634},
    zoom: 14
  });

  // Creating an InfoWindow object
  myInfoWindow = new google.maps.InfoWindow();
  // Creating a bounds object
  var bounds = new google.maps.LatLngBounds();

  // Looping through the neighborhood locations array to create an array of markers
  for (var i = 0; i < Model.locations.length; i++) {

    // Defining the position and title of the location
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

    // Listening to clicks on the marker
    /* jshint loopfunc: true */
    google.maps.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
        // Creating InfoWindow
        myInfoWindow.setContent(Model.locations[i].title);
        myInfoWindow.open(map, marker);
        // Animating marker
        self.animateMarker(marker);
        // Getting Wikipedia info. for current location
        Model.currentMarker = i;
        self.wikiInfo(Model.currentMarker);
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

  // Defining some observables
  this.filterInput = ko.observable(''); // filtering input text
  this.wTitle = ko.observable('');      // Wikipedia info. title
  this.wSynopsis = ko.observable('');   // Wikipedia info. synopsis
  this.wLinks = ko.observableArray([]); // Wikipedia info. links

  // A function to get Wikipedia info. for current location
  this.wikiInfo = function(i) {
    // The Wikipedia web service URL
    var wikiURL = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' + Model.locations[i].title + '&format=json&callback=wikiCallback';
    // Getting the Wikipedia info. using AJAX request
    $.ajax({
      url: wikiURL,
      dataType: 'jsonp',
      success: function(response) {
        // Parsing and displaying the data
        return new parseAjax(response);
      }
    })
    // In case the AJAX didn't work well
    .fail(function() {
      return parseAjax("failed");
    });
  };

  // A function to parse and display the Wikipedia info.
  var parseAjax = function(response) {
    // Removing the temporary span in the View
    if ($('#tempText').is(":visible")) $('#tempText').hide();
    // Hiding the old Wikipedia info.
    $('#wikipedia').hide();
    // Checking if the AJAX has a response
    if (response === "failed") {
      // If it failed, display an error message
      self.wTitle("Error");
      self.wSynopsis("Cannot load Wikipedia data!");
    // If the AJAX is successful
    } else {
      // Displaying Wikipedia info. title
      self.wTitle(response[0]);
      // Displaying Wikipedia info. synopsis (if any)
      self.wSynopsis(response[2].length > 0 ? response[2] : 'No Description!');
      // Displaying Wikipedia info. links (if any)
      self.wLinks([]);
      response[1].forEach(function (link) {
        self.wLinks.push( {'link': link, 'url': 'https://en.wikipedia.org/wiki/' + link} );
      });
    }
    // Displaying the Wikipedia info. slowly
    $('#wikipedia').show('slow');
  };

  // A computed observable to filter sidebar locations list depending on user input
  self.filtered = ko.computed(function() {
    // Getting filter keystrokes
    var filter = self.filterInput().toLowerCase();
    // Initializing the filtering state
    var filteredMarker = false;
    // Filtering the array
    this.filteredLocations = ko.utils.arrayFilter(Model.locations, function(loc) {
      // Getting location title
      var locTitle = loc.title.toLowerCase();
      // The filter chars must be less than location chars
      if (filter.length > locTitle.length || !filter)
        filteredMarker = false;
      // Checking the filter match
      filteredMarker = locTitle.substring(0, filter.length) === filter;
      // Showing/Hiding the Marker
      loc.marker.setVisible(filteredMarker);
      // Showing the InfoWindow
      filteredMarker ? myInfoWindow.setContent(loc.title) : myInfoWindow.close();
      // return the result
      return filteredMarker;
    });
    // Return the filtered locations list
    return this.filteredLocations;
  });

  // A function to link sidebar locations list with Wikipedia info.
  this.linkWiki = function(selected) {
    // Getting Wikipedia info. for current location
    Model.currentMarker = selected.id;
    self.wikiInfo(Model.currentMarker);
    // Animating the marker when clicked on the corresponding list item
    self.animateMarker(selected.marker);
    // Showing InfoWindow for the current location
    myInfoWindow.setContent(selected.title);
    myInfoWindow.open(Model.map, selected.marker);
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

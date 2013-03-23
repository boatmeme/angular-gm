/**
 * AngularGM - Google Maps Directives for AngularJS
 * @version v0.0.1 - 2013-03-23
 * @link http://dylanfprice.github.com/angular-gm
 * @author Dylan Price <the.dylan.price@gmail.com>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
'use strict';

/**
 * Module for embedding google maps into applications.
 *
 * See...
 * directives/gmMap.js              for usage of the <gm-map> directive
 * directives/gmMarkers.js          for usage of the <gm-markers> directive
 * services/googleMapsContainer.js  if you need to run custom configuration on the map, e.g. add new map types
 */
(function() {
  angular.module('googleMaps', []).

  /**
   * Default configuration.
   */
  value('googleMapsDefaults', {
    'mapOptions': {
      zoom : 8,
      center : new google.maps.LatLng(46, -120),
      mapTypeId : google.maps.MapTypeId.ROADMAP
    }
  });

})();

'use strict';

(function () {
  angular.module('googleMaps').

  /**
   * A directive for embedding google maps into your app. 
   *
   * Usage:
   * <gm-map gm-map-id="myMapId" gm-center="myCenter" gm-zoom="myZoom" gm-bounds="myBounds" gm-map-options="myMapOptions"></gm-map>
   *
   * myMapId:       angular expression that evaluates to a unique string id for
   *                the map, e.g. "'map_canvas'" or "myMapId" where myMapId is
   *                a variable in the current scope. This allows you to have
   *                multiple maps/instances of the directive.
   *
   * myCenter:      name for a center variable in the current scope.  The value
   *                will be a google.maps.LatLng object.
   *
   * myZoom:        name for a zoom variable in the current scope.  Value will
   *                be an integer.
   *
   * myBounds:      name for a bounds variable in the current scope.  Value
   *                will be a google.maps.LatLngBounds object.
   *
   * myMapOptions:  object in the current scope that is a
   *                google.maps.MapOptions object. If unspecified, will use the
   *                values in googleMapsDefaults.mapOptions.
   *                'googleMapsDefaults' is a service, so it is both injectable
   *                and overrideable (using $provide.decorator).
   *
   * All attributes except gm-map-options are required. The myCenter, myZoom,
   * and myBounds variables do not have to exist in the current scope--they
   * will be created if necessary. All three have bi-directional association,
   * i.e. drag or zoom the map and they will update, update them and the map
   * will change.  However, any initial state of these three variables will be
   * ignored.
   *
   * For more on configuring defaults, see module.js.
   *
   * If you need to get a handle on the google.maps.Map object, see
   * services/googleMapsContainer.js
   */
  directive('gmMap', ['$timeout', 'googleMapControllerFactory',
    function ($timeout, googleMapControllerFactory) {
  
    /** link function **/

    function link(scope, element, attrs, controller) {
      // initialize scope
      if (!angular.isDefined(scope.gmCenter)) {
        scope.center = {};
      }
      if (!angular.isDefined(scope.gmBounds)) {
        scope.bounds = {};
      }

      // Make sure gmMapId is defined
      // Note: redundant check in MapController. Can't hurt.
      if (!angular.isDefined(scope.gmMapId)) {
        throw 'googleMap must have non-empty gmMapId attribute';
      }

      // Check what's defined in attrs
      // Note: this is also redundant since angular will throw an exception if
      // these attributes are not set. I may make these optional in the future
      // (pending angular support).
      var hasCenter = false;
      var hasZoom = false;
      var hasBounds = false;

      if (attrs.hasOwnProperty('gmCenter')) {
        hasCenter = true;
      }
      if (attrs.hasOwnProperty('gmZoom')) {
        hasZoom = true;
      }
      if (attrs.hasOwnProperty('gmBounds')) {
        hasBounds = true;
      }

      var updateScope = function() {
        $timeout(function () {
          if (hasCenter || hasZoom || hasBounds) {
            scope.$apply(function (s) {
              if (hasCenter) {
                scope.gmCenter = controller.center;
              }
              if (hasZoom) {
                scope.gmZoom = controller.zoom;
              }
              if (hasBounds) {
                var b = controller.bounds;
                if (b) {
                  scope.gmBounds = b;
                }
              }
            });
          }
        });
      };

      controller.addMapListener('drag', updateScope);
      controller.addMapListener('zoom_changed', updateScope);
      controller.addMapListener('center_changed', updateScope);
      controller.addMapListener('bounds_changed', updateScope);
      
      if (hasCenter) {
        scope.$watch('gmCenter', function (newValue, oldValue) {
          var changed = (newValue !== oldValue);
          if (changed && !controller.dragging) {
            var latLng = newValue;
            if (latLng)
              controller.center = latLng;
          }
        }, true);
      }
      
      if (hasZoom) {
        scope.$watch('gmZoom', function (newValue, oldValue) {
          var ok = (newValue != null && !isNaN(newValue));
          if (ok && newValue !== oldValue) {
            controller.zoom = newValue;
          }
        });
      }

      if (hasBounds) {
        scope.$watch('gmBounds', function(newValue, oldValue) {
          var changed = (newValue !== oldValue);
          if (changed && !controller.dragging) {
            var bounds = newValue;
            if (bounds)
              controller.bounds = bounds; 
          }
        });
      }
    }


    return {
      restrict: 'AE',
      priority: 100,
      template: '<div>' + 
                  '<div id="" style="width:100%;height:100%;"></div>' + 
                  '<div ng-transclude></div>' + 
                '</div>',
      transclude: true,
      replace: true,
      scope: {
        gmCenter: '=',
        gmZoom: '=',
        gmBounds: '=',
        gmMapOptions: '&',
        gmMapId: '&'
      },
      controller: googleMapControllerFactory.MapController,
      link: link
    };
  }]);
})();

'use strict';

(function () {
  angular.module('googleMaps').

  /**
   * A directive for adding markers to a gmMap. You may have multiple per gmMap.
   *
   * To use, you specify an array of custom objects you define and tell the
   * directive how to extract location data from them. A marker will be created
   * for each of your objects. If you update the array of objects, the markers
   * will also update.
   *
   * Usage:
   * <gm-map ...>
   *   <gm-markers 
   *     gm-objects="myObjects" 
   *     gm-get-lat-lng="myGetLatLng" 
   *     gm-marker-options="myMarkerOptions" 
   *     gm-event="myEvent"
   *     gm-on-*event*="myEventHandler">
   *   </gm-markers>
   * </gm-map>
   *
   * myObjects:        an array of objects in the current scope. These can be
   *                   any objects you wish to attach to markers, the only
   *                   requirement is that they have a uniform method of
   *                   accessing a lat and lng.
   *
   * myGetLatLng:      an angular expression that given an object from
   *                   myObjects, evaluates to an object with lat and lng
   *                   properties. Your object can be accessed through the
   *                   variable 'object'.  For example, if myObjects is [
   *                     {id: 0, location: {lat:5,lng:5}}, 
   *                     {id: 1, location: {lat:6,lng:6}}
   *                   ]
   *                   then myGetLatLng would look like
   *                     { lat: object.location.lat, lng: object.location.lng }.
   *
   * myMarkerOptions:  object in the current scope that is a
   *                   google.maps.MarkerOptions object. If unspecified, google
   *                   maps api defaults will be used.
   *
   * myEvent:          name for a variable in the current scope that is used to
   *                   simulate events on a marker. Setting this variable to an
   *                   object of the form {
   *                     event: 'click',
   *                     location: new google.maps.LatLng(45, -120),
   *                   }
   *                   will generate the named event on the marker at the given
   *                   location, if such a marker exists. Note: when setting
   *                   the myEvent variable, you must set it to a new object
   *                   for the changes to be detected. Code like
   *                   'myEvent["location"] = new google.maps.LatLng(45, -120)'
   *                   will not work.
   *
   * myEventHandler:   an angular expression which evaluates to an event
   *                   handler. This handler will be attached to each marker's
   *                   *event* event. The variables 'object' and 'marker'
   *                   evaluate to your object and the google.maps.Marker,
   *                   respectively. For example:
   *                     gm-on-click="myClickFn(object, marker)"
   *                   will call your myClickFn whenever a marker is clicked.
   *                   You may have multiple gm-on-*event* handlers, but only
   *                   one for each type of event.
   *
   *
   * Only the gm-objects and gm-get-lat-lng attributes are required.
   *
   */
  directive('gmMarkers', ['$log', '$parse', '$timeout', 'googleMapsUtils', 
    function($log, $parse, $timeout, googleMapsUtils) {

    /** aliases */
    var latLngEqual = googleMapsUtils.latLngEqual;
    var objToLatLng = googleMapsUtils.objToLatLng;


    function link(scope, element, attrs, controller) {
      // check attrs
      if (!('gmObjects' in attrs)) {
        throw 'gmObjects attribute required';
      } else if (!('gmGetLatLng' in attrs)) {
        throw 'gmGetLatLng attribute required';
      }

      var handlers = {}; // map events -> handlers

      // retrieve gm-on-___ handlers
      angular.forEach(attrs, function(value, key) {
        if (key.lastIndexOf('gmOn', 0) === 0) {
          var event = angular.lowercase(key.substring(4));
          var fn = $parse(value);
          handlers[event] = fn;
        }
      });

      // fn for updating markers from objects
      var updateMarkers = function(objects) {

        var markerOptions = scope.gmMarkerOptions();
        var objectHash = {};

        angular.forEach(objects, function(object, i) {
          var latLngObj = scope.gmGetLatLng({object: object});
          var position = objToLatLng(latLngObj);
          if (position == null) {
            return;
          }

          // hash objects for quick access
          var hash = position.toUrlValue(controller.precision);
          objectHash[hash] = object;

          // add marker
          if (!controller.hasMarker(latLngObj.lat, latLngObj.lng)) {

            var options = {};
            angular.extend(options, markerOptions, {position: position});

            controller.addMarker(options);
            var marker = controller.getMarker(latLngObj.lat, latLngObj.lng);

            // set up marker event handlers
            angular.forEach(handlers, function(handler, event) {
              controller.addListener(marker, event, function() {
                $timeout(function() {
                       // scope is this directive's isolate scope
                       // scope.$parent is the scope of ng-transclude
                       // scope.$parent.$parent is the one we want
                  handler(scope.$parent.$parent, {
                    object: object,
                    marker: marker
                  });
                });
              });
            });
          }
        });

        // remove 'orphaned' markers
        var orphaned = [];
        
        controller.forEachMarker(function(marker) {
          var markerPosition = marker.getPosition();
          var hash = markerPosition.toUrlValue(controller.precision);

          if (!(hash in objectHash)) {
            orphaned.push(marker);
          }
        });

        angular.forEach(orphaned, function(marker, i) {
          var position = marker.getPosition();
          controller.removeMarker(position.lat(), position.lng());
        });
      }; // end updateMarkers()

      // watch objects
      scope.$watch('gmObjects().length', function(newValue, oldValue) {
        if (newValue != null && newValue !== oldValue) {
          updateMarkers(scope.gmObjects());
        }
      });

      scope.$watch('gmObjects()', function(newValue, oldValue) {
        if (newValue != null && newValue !== oldValue) {
          updateMarkers(scope.gmObjects());
        }
      });

      // watch gmEvent
      scope.$watch('gmEvent()', function(newValue, oldValue) {
        if (newValue != null && newValue !== oldValue) {
          var event = newValue.event;
          var location = newValue.location;
          var marker = controller.getMarker(location.lat(), location.lng());
          if (marker != null) {
            $timeout(angular.bind(this, controller.trigger, marker, event));
          }
        }
      });

      // initialize markers
      $timeout(angular.bind(null, updateMarkers, scope.gmObjects()));
    }


    return {
      restrict: 'AE',
      priority: 100,
      scope: {
        gmObjects: '&',
        gmGetLatLng: '&',
        gmMarkerOptions: '&',
        gmEvent: '&'
      },
      require: '^gmMap',
      link: link
    };
  }]);
})();

'use strict';

(function () {
  angular.module('googleMaps').

  /**
   * Directive controller which is owned by the gmMap directive and shared
   * among all other google maps directives.
   */
  factory('googleMapControllerFactory', ['googleMapsUtils', 'googleMapsDefaults', 'googleMapsContainer',
    function (googleMapsUtils, googleMapsDefaults, googleMapsContainer) {

    /** aliases */
    var latLngEqual = googleMapsUtils.latLngEqual;
    var boundsEqual = googleMapsUtils.boundsEqual;
    var hasNaN = googleMapsUtils.hasNaN;
    var gMDefaults = googleMapsDefaults;
    var gMContainer = googleMapsContainer;


    /** MapController class **/
    
    /* 
     * Construct a new controller for the gmMap directive.
     * @param {angular.Scope} $scope
     * @param {angular.element} $element
     * @param {angular.Attributes} $attrs
     * @constructor
     */
    var MapController = function($scope, $element, $attrs) {

      var mapId = $scope.gmMapId();
      if (!mapId) { throw 'googleMap must have non-empty gmMapId attribute'; }

      var mapDiv = $element.find('[id]');
      mapDiv.attr('id', mapId);

      var config = this._getConfig($scope, gMDefaults);

      // 'private' properties
      this._map = this._createMap(mapId, mapDiv, config, gMContainer);
      this._markers = {};

      // 'public' properties
      this.dragging = false;

      Object.defineProperties(this, {
        'precision': {
          value: MapController.precision,
          writeable: false
        },

        'center': {
          configurable: true, // for testing so we can mock
          get: function() {
             return this._map.getCenter();
           },
          set: function(center) {
            if (hasNaN(center)) 
              throw 'center contains null or NaN';
            var changed = !latLngEqual(this.center, center);
            if (changed) {
              // TODO: change to panTo
              //this._map.setCenter(center);
              this._map.panTo(center);
            }
          } 
        },

        'zoom': {
          configurable: true, // for testing so we can mock
          get: function() {
            return this._map.getZoom();
          },
          set: function(zoom) {
            if (!(zoom != null && !isNaN(zoom))) 
              throw 'zoom was null or NaN';
            var changed = this.zoom !== zoom;
            if (changed) {
              this._map.setZoom(zoom);
            }
          }
        },

        'bounds': {
          configurable: true, // for testing so we can mock
          get: function() {
            return this._map.getBounds();
          },
          set: function(bounds) {
            var numbers = !hasNaN(bounds.getSouthWest()) &&
                          !hasNaN(bounds.getNorthEast());
            if (!numbers) 
              throw 'bounds contains null or NaN';

            var changed = !(boundsEqual(this.bounds, bounds));
            if (changed) {
              this._map.fitBounds(bounds);
            }
          }
        }
      });

      this._initDragListeners();
      $scope.$on('$destroy', angular.bind(this, this._destroy, mapId));
    };


    // used for hashing marker objects
    MapController.precision = 3;


    // Retrieve google.maps.MapOptions
    MapController.prototype._getConfig = function($scope, gMDefaults) {
      // Get config or defaults
      var defaults = gMDefaults.mapOptions;
      var config = {};
      angular.extend(config, defaults, $scope.gmMapOptions());
      return config;
    };


    // Create the map and add to googleMapsContainer
    MapController.prototype._createMap = function(id, element, config, gMContainer) {
      var map = gMContainer.getMap(id);
      if (!map) {
        map = new google.maps.Map(element[0], config);
        gMContainer.addMap(id, map);
      } else {
        throw 'A map with id ' + id + ' already exists. You must use' +
          ' different ids for each instance of the googleMap directive.';
      }
      return map;
    };

        
    // Set up listeners to update this.dragging
    MapController.prototype._initDragListeners = function() {
      var self = this;
      this.addMapListener('dragstart', function () {
        self.dragging = true;
      });
      
      this.addMapListener('idle', function () {
        self.dragging = false;
      });
      
      this.addMapListener('drag', function() {
        self.dragging = true;   
      });
    };


    MapController.prototype._destroy = function(mapId) {
      gMContainer.removeMap(mapId);
    };

    
    /**
     * Alias for google.maps.event.addListener(map, event, handler)
     * @param {string} event an event defined on google.maps.Map
     * @param {Function} a handler for the event
     */
    MapController.prototype.addMapListener = function(event, handler) {
      google.maps.event.addListener(this._map, 
          event, handler);
    };


    /**
     * Alias for google.maps.event.addListenerOnce(map, event, handler)
     * @param {string} event an event defined on google.maps.Map
     * @param {Function} a handler for the event
     */
    MapController.prototype.addMapListenerOnce = function(event, handler) {
      google.maps.event.addListenerOnce(this._map, 
          event, handler);
    };


    /**
     * Alias for google.maps.event.addListener(object, event, handler)
     */
    MapController.prototype.addListener = function(object, event, handler) {
      google.maps.event.addListener(object, event, handler);
    };


    /**
     * Alias for google.maps.event.addListenerOnce(object, event, handler)
     */
    MapController.prototype.addListenerOnce = function(object, event, handler) {
      google.maps.event.addListenerOnce(object, event, handler);
    };


    /**
     * Alias for google.maps.event.trigger(map, event)
     * @param {string} event an event defined on google.maps.Map
     */
    MapController.prototype.mapTrigger = function(event) {
      google.maps.event.trigger(this._map, event);
    };


    /**
     * Alias for google.maps.event.trigger(object, event)
     */
    MapController.prototype.trigger = function(object, event) {
      google.maps.event.trigger(object, event);
    };


    /**
     * Adds a new marker to the map.
     * @param {google.maps.MarkerOptions} markerOptions
     * @return {boolean} true if a marker was added, false if there was already
     *   a marker at this position. 'at this position' means delta_lat and
     *   delta_lng are < 0.0005
     * @throw if markerOptions does not have all required options (i.e. position)
     */
    MapController.prototype.addMarker = function(markerOptions) {
      var opts = {};
      angular.extend(opts, markerOptions);

      if (!(opts.position instanceof google.maps.LatLng)) {
        throw 'markerOptions did not contain a position';
      }

      var marker = new google.maps.Marker(opts);
      var position = marker.getPosition();
      if (this.hasMarker(position.lat(), position.lng())) {
        return false;
      }
      
      var hash = position.toUrlValue(this.precision);
      this._markers[hash] = marker;
      marker.setMap(this._map);
      return true;
    };      


    /**
     * @param {number} lat
     * @param {number} lng
     * @return {boolean} true if there is a marker with the given lat and lng
     */
    MapController.prototype.hasMarker = function(lat, lng) {
      return (this.getMarker(lat, lng) instanceof google.maps.Marker);
    };


    /**
     * @param {number} lat
     * @param {number} lng
     * @return {google.maps.Marker} the marker at given lat and lng, or null if
     *   no such marker exists
     */
    MapController.prototype.getMarker = function (lat, lng) {
      if (lat == null || lng == null)
        throw 'lat or lng was null';

      var latLng = new google.maps.LatLng(lat, lng);
      var hash = latLng.toUrlValue(this.precision);
      if (hash in this._markers) {
        return this._markers[hash];
      } else {
        return null;
      }
    };  


    /**
     * @param {number} lat
     * @param {number} lng
     * @return {boolean} true if a marker was removed, false if nothing
     *   happened
     */
    MapController.prototype.removeMarker = function(lat, lng) {
      if (lat == null || lng == null)
        throw 'lat or lng was null';

      var latLng = new google.maps.LatLng(lat, lng);

      var removed = false;
      var hash = latLng.toUrlValue(this.precision);
      var marker = this._markers[hash];
      if (marker) {
        marker.setMap(null);
        removed = true;
      }
      this._markers[hash] = null;
      delete this._markers[hash];
      return removed;
    };


    /**
     * Changes bounds of map to view all markers.
     *
     * Note: after calling this function, this.bounds, this.center, and
     * this.zoom may temporarily be null as the map moves. Therefore, use
     * this.addMapListenerOnce if you need to access these values immediately
     * after calling fitToMarkers.
     */
    MapController.prototype.fitToMarkers = function () {
      var bounds = new google.maps.LatLngBounds();

      this.forEachMarker(function(marker) {
        bounds.extend(marker.getPosition());
      });

      this.bounds = bounds;
    };


    /**
     * Applies a function to each marker.
     * @param {Function} fn will called with marker as first argument
     * @throw if fn is null or undefined
     */
    MapController.prototype.forEachMarker = function(fn) {
      if (fn == null) { throw 'fn was null or undefined'; }
      angular.forEach(this._markers, function(marker, hash) {
        if (marker != null) {
          fn(marker);
        }
      });
    };


    return {
      MapController: MapController
    };

  }]);
})();


'use strict';

(function () {
  angular.module('googleMaps').

  /**
   * A container which maps mapIds to google.maps.Map instances, and
   * additionally allows getting a promise of a map for custom configuration of
   * the map.
   *
   * If you want a handle to the map, you should generally use the
   * #getMapPromise(mapId) method so you can guarantee the map will be
   * initialized. For example,
   *
   * function MyCtrl(googleMapsContainer) {
   *   var gmapPromise = googleMapsContainer.getMapPromise('myMapid');
   *
   *   gmapPromise.then(function(gmap) {
   *     // google map configuration here
   *   });
   * }
   */
  factory('googleMapsContainer', ['$q', function($q) {
    var maps = {};
    var defers = {};

    /**
     * Add a map to the container.
     * @param {string} mapId the unique identifier for the map
     * @param {google.maps.Map} map the google map
     * @throw if there is already a map with mapId, or if map is not a
     *   google.maps.Map
     */
    function addMap(mapId, map) {
      if (!(map instanceof google.maps.Map)) {
        throw 'map not a google.maps.Map: ' + map; 
      } else if (mapId in maps) {
        throw 'already contain map with id ' + mapId;
      }
      maps[mapId] = map;
      if (mapId in defers) {
        defers[mapId].resolve(map);
      }
    }

    /**
     * Get a map from the container.
     * @param {string} mapId the unique id of the map
     * @return {google.maps.Map|undefined} the map, or undefined if there is no
     *   map for mapId
     */
    function getMap(mapId) {
      return maps[mapId];
    }

    /**
     * Returns a promise of a map for the given mapId
     * @param {string} mapId the unique id of the map that may or may not have
     *   been created yet
     * @return {angular.q.promise} a promise of a map that will be resolved
     *   when the map is added
     */
    function getMapPromise(mapId) {
      var defer = defers[mapId] || $q.defer();  
      defers[mapId] = defer;
      return defer.promise;
    }

    /**
     * Removes map with given mapId from this container, and deletes the map.
     * In order for this to work you must ensure there are no references to the
     * map object.
     */
    function removeMap(mapId) {
      if (mapId in maps) {
        delete maps[mapId];
      }
      if (mapId in defers) {
        delete defers[mapId];
      }
    }

    /**
     * Removes all maps and unresolved map promises. Only for testing, see
     * #removeMap(mapId).
     */
    function clear() {
      maps = {};
      defers = {};
    }

    return {
      addMap: addMap,
      getMap: getMap,
      getMapPromise: getMapPromise,
      removeMap: removeMap,
      clear: clear
    };
  }]);
})();

'use strict';

(function () {
  angular.module('googleMaps').

  /**
   * Common utility functions.
   */
  factory('googleMapsUtils', [function() {

    /**
     * Check if two floating point numbers are equal. 
     * @return true if f1 and f2 are 'very close'
     */
    function floatEqual (f1, f2) {
      return (Math.abs(f1 - f2) < 0.000001);
    }

    /**
     * @param {google.maps.LatLng} l1
     * @param {google.maps.LatLng} l2
     * @return {boolean} true if l1 and l2 are 'very close'. If either are null
     * or not google.maps.LatLng objects returns false.
     */
    function latLngEqual(l1, l2) {
      if (!(l1 instanceof google.maps.LatLng && 
            l2 instanceof google.maps.LatLng)) {
        return false; 
      }
      return floatEqual(l1.lat(), l2.lat()) && floatEqual(l1.lng(), l2.lng());
    }

    /**
     * @param {google.maps.LatLngBounds} b1
     * @param {google.maps.LatLngBounds} b2
     * @return {boolean} true if b1 and b2 are 'very close'. If either are null
     * or not google.maps.LatLngBounds objects returns false.
     */
    function boundsEqual(b1, b2) {
      if (!(b1 instanceof google.maps.LatLngBounds &&
            b2 instanceof google.maps.LatLngBounds)) {
        return false;
      }
      var sw1 = b1.getSouthWest();
      var sw2 = b2.getSouthWest();
      var ne1 = b1.getNorthEast();
      var ne2 = b2.getNorthEast();

      return latLngEqual(sw1, sw2) && latLngEqual(ne1, ne2);
    }

    /**
     * @param {google.maps.LatLng} latLng
     * @return {Object} object literal with 'lat' and 'lng' properties.
     * @throw if latLng not instanceof google.maps.LatLng
     */
    function latLngToObj(latLng) {
      if (!(latLng instanceof google.maps.LatLng)) 
        throw 'latLng not a google.maps.LatLng';

      return {
        lat: latLng.lat(),
        lng: latLng.lng()
      };
    }

    /**
     * @param {Object} obj of the form { lat: 40, lng: -120 } 
     * @return {google.maps.LatLng} returns null if problems with obj (null,
     * NaN, etc.)
     */
    function objToLatLng(obj) {
      if (obj != null) {
        var lat = obj.lat;
        var lng = obj.lng;
        var ok = !(lat == null || lng == null) && !(isNaN(lat) ||
            isNaN(lng));
        if (ok) {
          return new google.maps.LatLng(lat, lng);
        }
      }  
      return null;
    }

    /**
     * @param {google.maps.LatLng} latLng
     * @return true if either lat or lng of latLng is null or isNaN
     */
    function hasNaN(latLng) {
      if (!(latLng instanceof google.maps.LatLng))
        throw 'latLng must be a google.maps.LatLng';

      // google.maps.LatLng converts NaN to null, so check for both
      var isNull = (latLng.lat() == null || latLng.lng() == null);
      var isNotaN =  isNaN(latLng.lat()) || isNaN(latLng.lng());
      return isNull || isNotaN;
    }

    return {
      latLngEqual: latLngEqual,
      boundsEqual: boundsEqual,
      latLngToObj: latLngToObj,
      objToLatLng: objToLatLng,
      hasNaN: hasNaN
    };
  }]);
})();
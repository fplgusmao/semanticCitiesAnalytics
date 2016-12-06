/* global toastr:false, d3:false, L:false, L.FreeDraw:false, turf:false, leafletImage:false */
(function () {
    'use strict';

    angular
        .module('scaApp.core')
        .constant('hostPath', '')
        //^^^ the prefix path for accessing the app files
        //^^^ e.g: 'dir/in/host'
        //^^^ !!!MUST!!! end with '/'
        .constant('toastr', toastr)
        .constant('leaflet', L)
        .constant('projectToLeaflet', L.Proj)
        .constant('mapToImage', leafletImage)
        .constant('turf', turf);
})();

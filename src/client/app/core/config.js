(function () {
    'use strict';

    var core = angular.module('scaApp.core');

    core.config(toastrConfig);

    toastrConfig.$inject = ['toastr'];
    /* @ngInject */
    function toastrConfig(toastr) {
        toastr.options.timeOut = 4000;
        toastr.options.positionClass = 'toast-bottom-right';
    }

    var config = {
        appErrorPrefix: '[semanticCitiesAnalytics Error] ',
        appTitle: 'Semantic Cities Analytics'
    };

    core.value('config', config);

    ////////////////////
    //Leaflet configuration
    core.config(leafletConfig);

    leafletConfig.$inject = ['leaflet', 'hostPath'];
    /* @ngInject */
    function leafletConfig(leaflet, hostPath) {
        leaflet.Icon.Default.imagePath = hostPath + 'images/';
    }

    ////////////////////
    //General configuration
    core.config(configure);

    configure.$inject = ['$compileProvider', '$logProvider', '$httpProvider',
                         'routerHelperProvider', 'exceptionHandlerProvider'];
    /* @ngInject */
    function configure($compileProvider, $logProvider, $httpProvider,
                       routerHelperProvider, exceptionHandlerProvider) {

        $compileProvider
            .aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);

        if ($logProvider.debugEnabled) {
            $logProvider.debugEnabled(true);
        }

        $httpProvider.defaults.cache = true;

        exceptionHandlerProvider.configure(config.appErrorPrefix);
        routerHelperProvider.configure({
            docTitle: config.appTitle + ': '
        });
    }
})();

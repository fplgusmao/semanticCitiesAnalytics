(function () {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .run(appRun);

    appRun.$inject = ['routerHelper'];

    /* @ngInject */
    function appRun(routerHelper) {
        routerHelper.configureStates(getStates());
    }

    function getStates() {
        return [
            {
                state: 'analyzer.areas',
                config: {
                    url: '/areas',
                    templateUrl: 'app/analyzer/areas/areas-analyzer.html',
                    controller: 'AreasAnalyzerController',
                    controllerAs: 'vm',
                    title: 'Analyzer'
                }
            }
        ];
    }
})();

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
                state: 'analyzer.multipleAreas',
                config: {
                    url: '/multiple-areas',
                    templateUrl: 'app/analyzer/multiple-areas/multiple-areas-analyzer.html',
                    controller: 'MultipleAreasAnalyzerController',
                    controllerAs: 'vm',
                    title: 'Analyzer'
                }
            }
        ];
    }
})();

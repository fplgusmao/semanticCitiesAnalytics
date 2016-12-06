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
                state: 'analyzer.points',
                config: {
                    url: '/points',
                    templateUrl: 'app/analyzer/points/points-analyzer.html',
                    controller: 'PointsAnalyzerController',
                    controllerAs: 'vm',
                    title: 'Analyzer'
                }
            }
        ];
    }
})();

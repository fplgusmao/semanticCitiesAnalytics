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
                state: 'analyzer',
                config: {
                    url: '/analyzer',
                    templateUrl: 'app/analyzer/analyzer.html',
                    controller: 'AnalyzerController',
                    controllerAs: 'vm',
                    title: 'analyzer'
                }
            }
        ];
    }
})();

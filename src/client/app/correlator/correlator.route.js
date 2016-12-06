(function () {
    'use strict';

    angular
        .module('scaApp.correlator')
        .run(appRun);

    appRun.$inject = ['routerHelper'];

    /* @ngInject */
    function appRun(routerHelper) {
        routerHelper.configureStates(getStates());
    }

    function getStates() {
        return [
            {
                state: 'correlator',
                config: {
                    url: '/correlator',
                    templateUrl: 'app/correlator/correlator.html',
                    controller: 'CorrelatorController',
                    controllerAs: 'vm',
                    title: 'Results Correlator'
                }
            }
        ];
    }
})();

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
                state: 'analyzer.questionnaire',
                config: {
                    url: '/questionnaire',
                    templateUrl: 'app/analyzer/questionnaire/questionnaire-analyzer.html',
                    controller: 'QuestionnaireAnalyzerController',
                    controllerAs: 'vm',
                    title: 'Analyzer'
                }
            }
        ];
    }
})();

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
                state: 'analyzer.surveyInformation',
                config: {
                    url: '/survey-information',
                    templateUrl: 'app/analyzer/survey-information/' +
                        'survey-information-analyzer.html',
                    controller: 'SurveyInformationAnalyzerController',
                    controllerAs: 'vm',
                    title: 'Analyzer'
                }
            }
        ];
    }
})();

(function () {
    'use strict';

    angular
        .module('scaApp.layout')
        .controller('ShellController', ShellController);

    ShellController.$inject = ['$state', 'routerHelper'];
    /* @ngInject */
    function ShellController($state, routerHelper) {
        var vm = this;
        vm.getMenuStatus = getMenuStatus;
        vm.isOnSeparateScreen = isOnSeparateScreen;
        vm.isOnAnalyzer = isOnAnalyzer;
        vm.isOnCorrelator = isOnCorrelator;

        activate();

        ////////////////

        function activate() {
            $state.go('dashboard');

            getNavStates();
        }

        function isOnSeparateScreen() {
            return isOnAnalyzer() || isOnCorrelator(); //TODO: de-hack
        }

        function isOnAnalyzer() {
            return $state.includes('analyzer');
        }

        function isOnCorrelator() {
            return $state.includes('correlator');
        }

        /**
         * Determines if the given state is the current active state, returning
         * the due class name to apply
         * @param   {object} s State object
         * @returns {string} CSS class name to apply to the element, empty
         *                   string if there's no class to apply
         */
        function getMenuStatus(s) {
            if (!s.title || !$state.current || !$state.current.title) {
                return '';
            }

            return $state.current.title.substr(0, s.title.length) === s.title ?
                'active' : '';

        }

        /**
         * Loads the app's states to where the user can go to using the
         * navigation bar
         */
        function getNavStates() {
            var states = routerHelper.getStates();
            vm.appNavSections = states.filter(function(s) {
                return s.settings && s.settings.nav;
            }).sort(function(s1, s2) {
                return s1.settings.nav - s2.settings.nav;
            });
        }
    }
})();

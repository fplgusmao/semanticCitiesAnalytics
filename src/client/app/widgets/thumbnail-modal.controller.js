(function() {
    'use strict';

    angular
        .module('scaApp.widgets')
        .controller('thumbnailModalController', thumbnailModalController);

    thumbnailModalController.$inject = ['$uibModalInstance',
                                        'resolvedTitle', 'resolvedData'];

    /* @ngInject */
    function thumbnailModalController($uibModalInstance,
                                      resolvedTitle, resolvedData) {
        /*jshint validthis: true */
        var vm = this;

        vm.data = resolvedData;
        vm.title = resolvedTitle;
        vm.close = close;

        ////////////////

        function close() {
            $uibModalInstance.close();
        }
    }
})();

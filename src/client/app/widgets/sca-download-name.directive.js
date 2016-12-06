(function () {
    'use strict';

    angular
        .module('scaApp.widgets')
        .directive('scaDownloadName', scaDownloadName);

    scaDownloadName.$inject = [];

    /* @ngInject */
    function scaDownloadName() {
        var directive = {
            link: link,
            restrict: 'A',
            scope: {
                downloadName : '=scaDownloadName',
                downloadType : '=scaDownloadType'
            }
        };
        return directive;

        function link(scope, element, attrs, controller) {
            var filename = scope.downloadName;
            scope.filename = filename;

            if (scope.downloadType) {
                scope.filename += '.' + scope.downloadType;
            }

            element.attr('download', scope.filename);

            scope.$watch(function () {
                return scope.downloadName;
            }, function (newName) {
                //scope.filename = newName + '.' + scope.downloadType;
                scope.filename = newName;

                if (scope.downloadType) {
                    scope.filename += '.' + scope.downloadType;
                }

                element.attr('download', scope.filename);
            });
        }
    }
})();

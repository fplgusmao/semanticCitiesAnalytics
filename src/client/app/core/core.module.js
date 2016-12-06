(function () {
    'use strict';

    angular
        .module('scaApp.core', [
        'blocks.exception', 'blocks.logger', 'blocks.router',
        'blocks.phraseNormalizer', 'ui.router'
    ]);
})();

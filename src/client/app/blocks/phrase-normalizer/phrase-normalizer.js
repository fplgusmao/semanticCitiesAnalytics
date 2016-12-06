(function () {
    'use strict';
    angular
        .module('blocks.phraseNormalizer')
        .factory('phraseNormalizer', phraseNormalizer);

    phraseNormalizer.$inject = [];

    /* @ngInject */
    function phraseNormalizer() {
        var FROM_CAMEL = /([a-z])([A-Z])/g,
            FROM_DASHED = /-([a-z])/g;

        var exports = {
            toCamelCase: toCamelCase,
            toHumanFromDashed : toHumanFromDashed,
            toHumanFromCamel : toHumanFromCamel,
            toDashed: toDashed
        };

        return exports;

        ////////////////

        function toCamelCase(dashed, capitalize) {
            if (!angular.isString(dashed)) {
                return dashed;
            }

            var camelCased = dashed.replace(
                FROM_DASHED,
                function (g) {
                    return g[1].toUpperCase();
                }
            );

            if (capitalize) {
                camelCased = camelCased.charAt(0).toUpperCase() +
                    camelCased.slice(1);
            }

            return camelCased;
        }

        function toHuman(capturePattern, phrase, capitalize, everyWord) {
            if (!angular.isString(phrase)) {
                return phrase;
            }

            if (capitalize) {
                phrase = phrase.charAt(0).toUpperCase() +
                    phrase.slice(1);
            }

            var humanized = phrase.replace(
                capturePattern,
                function(g) {
                    var part = g[0] + ' ';

                    if (capitalize && everyWord) {
                        part += g[1].toUpperCase();
                    } else {
                        part += g[1].toLowerCase();
                    }

                    return part;
                }
            );

            return humanized;
        }

        function toHumanFromDashed(phrase, capitalize, everyWord) {
            if (!angular.isString(phrase)) {
                return phrase;
            }

            var humanized = phrase.replace(FROM_DASHED, function (g) {
                if (capitalize && everyWord) {
                    return ' ' + g[1].toUpperCase();
                } else {
                    return ' ' + g[1].toLowerCase();
                }
            });

            if (capitalize) {
                humanized = humanized.charAt(0).toUpperCase() +
                    humanized.slice(1);
            }

            return humanized;

        }

        function toHumanFromCamel(phrase, capitalize, everyWord) {
            if (!angular.isString(phrase)) {
                return phrase;
            }

            var partHumanized = phrase.replace(
                FROM_CAMEL,
                function(g) {
                    return g[0] + ' ' + g[1].toLowerCase();
                }
            );

            //to solve the "aOne letter word" problem
            var fullyHumanized = partHumanized.replace(
                FROM_CAMEL,
                function(g) {
                    return g[0] + ' ' + g[1].toLowerCase();
                }
            );

            if (capitalize) {
                fullyHumanized = fullyHumanized.charAt(0).toUpperCase() +
                    fullyHumanized.slice(1);
            }

            if (capitalize && everyWord) {
                fullyHumanized = fullyHumanized.replace(
                    /(?:^|\s)\S/g,
                    function(a) {
                        return a.toUpperCase();
                    }
                );
            }

            return fullyHumanized;
        }

        function toDashed(camelCased) {
            if (!angular.isString(camelCased)) {
                return camelCased;
            }

            var partlyDashed = camelCased.replace(FROM_CAMEL, function (g) {
                    return g[0].toLowerCase() + '-' + g[1].toLowerCase();
                }
            );

            var fullyDashed = partlyDashed.replace(FROM_CAMEL, function (g) {
                    return g[0].toLowerCase() + '-' + g[1].toLowerCase();
                }
            );

            return fullyDashed;
        }
    }
})();

/* jshint -W117, -W030 */
describe('phrase normalizer', function () {
    var camel = '',
        camelCap = '',
        dash = '';

    var human = '',
        humanCap = '',
        humanCapAll = '';

    beforeEach(function () {
        bard.appModule('blocks.phraseNormalizer');
        bard.inject(this, 'phraseNormalizer');

        camel = 'thisIsATest';
        camelCap = 'ThisIsATest';
        dash = 'this-is-a-test';

        human = 'this is a test';
        humanCap = 'This is a test';
        humanCapAll = 'This Is A Test';
    });

    describe('toCamelCase', function () {
        it('should turn a dashed string into camel case', function () {
            var result = phraseNormalizer.toCamelCase(dash);
            expect(result).to.equal(camel);
        });

        it('should turn a dashed string into a capitalized camel case',
           function () {
            var result = phraseNormalizer.toCamelCase(dash, true);
            expect(result).to.equal(camelCap);
        });
    });

    describe('toDashed', function () {
        it('should turn a camel cased string to a dash separated one',
           function () {
            var result = phraseNormalizer.toDashed(camel);
            expect(result).to.equal(dash);
        });
    });

    describe('toHuman', function () {
        it('should turn a camel cased string to readable text',
           function () {
            var result = phraseNormalizer.toHumanFromCamel(camel);
            expect(result).to.equal(human);
        });

        it('should turn a dash-separated string to readable text',
           function () {
            var result = phraseNormalizer.toHumanFromDashed(dash);
            expect(result).to.equal(human);
        });

        it('should make the first word capitalized', function () {
            var result = phraseNormalizer.toHumanFromCamel(camel, true);
            expect(result).to.equal(humanCap);

            result = phraseNormalizer.toHumanFromDashed(dash, true);
            expect(result).to.equal(humanCap);
        });

        it('should make all words capitalized', function () {
            var result = phraseNormalizer.toHumanFromCamel(camel, true, true);
            expect(result).to.equal(humanCapAll);

            result = phraseNormalizer.toHumanFromDashed(dash, true, true);
            expect(result).to.equal(humanCapAll);
        });
    });
});

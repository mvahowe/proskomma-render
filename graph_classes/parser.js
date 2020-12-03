const {ProsKomma} = require('proskomma');
const fse = require('fs-extra');
const path = require('path');

const fp = process.argv[2];
const lang = process.argv[3];
const abbr = process.argv[4];

const content = fse.readFileSync(path.resolve(__dirname, fp));
let contentType = fp.split('.').pop();
if (contentType === "xml") {
    contentType = "lexicon";
}
const pk = new ProsKomma();
pk.importDocument(
    {lang, abbr},
     contentType,
     content,
    {}
);

pk.gqlQuery(
    '{' +
    '  docSets {' +
    '    selectors { key value }' +
    '    tags' +
    '    documents {' +
    '      id' +
    '      headers { key value }' +
    '      sequences {' +
    '        id' +
    '        type' +
    '        blocks {' +
    '          bs {label}' +
    '          bg {subType sequenceId}' +
    '          items {' +
    '            ... on Token { subType chars }' +
    '            ... on Scope { itemType label }' +
    '            ... on Graft { subType sequenceId }' +
    '          }' +
    '        }' +
    '      }' +
    '    }' +
    '  }' +
    '}'
).then((res) => console.log(JSON.stringify(res, null, 2)));
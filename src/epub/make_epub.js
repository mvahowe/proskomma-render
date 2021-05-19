// node make_epub.js config_nfc18.json out.epub

const fse = require('fs-extra');
const path = require('path');

const {Proskomma} = require('proskomma');
const doModelQuery = require('../model_query');
const GlossaryScan = require('./GlossaryScan');
const MainEpubModel = require('./MainEpubModel');
const ScriptureParaModel = require('../ScriptureParaModel');

const bookMatches = str => {
    for (const book of config.books) {
        if (str.includes(book) || str.includes(book.toLowerCase())) {
            return true;
        }
    }
    return false;
}

const doGlossaryScan = (config, result) => {
    ts = Date.now();
    const model = new ScriptureParaModel(result, config);
    model.addDocSetModel('default', new GlossaryScan(result, model.context, config));
    model.render();
    console.log(`Glossary Scan in  ${(Date.now() - ts) / 1000} sec`);
    console.log(model.logString());
}

const doMainEpubRender = (config, result) => {
    ts = Date.now();
    const model = new ScriptureParaModel(result, config);
    model.addDocSetModel('default', new MainEpubModel(result, model.context, config));
    model.render();
    console.log(`Main ePub rendered in  ${(Date.now() - ts) / 1000} sec`);
    console.log(model.logString());
}

const doRender = async (pk, config) => {
    await doModelQuery(pk)
        .then(result => {
                console.log(`Query processed in  ${(Date.now() - ts) / 1000} sec`);
                doGlossaryScan(config, result);
                doMainEpubRender(config, result);
            }
        )
};

const configPath = path.resolve(__dirname, process.argv[2]);
const config = fse.readJsonSync(configPath);
config.codeRoot = __dirname;
config.configRoot = path.dirname(configPath);
config.outputPath = process.argv[3];
if (!config.outputPath) {
    throw new Error("USAGE: node make_epub.js config_nfc18.json out.epub");
}

let ts = Date.now();
let nBooks = 0;

const pk = new Proskomma();
const fqSourceDir = path.resolve(config.configRoot, config.sourceDir);
for (const filePath of fse.readdirSync(fqSourceDir)) {
    if (bookMatches(filePath)) {
        console.log(`   ${filePath}`);
        nBooks++;
        const content = fse.readFileSync(path.join(fqSourceDir, filePath));
        const contentType = filePath.split('.').pop();
        pk.importDocument(
            {lang: "xxx", abbr: "yyy"},
            contentType,
            content,
            {}
        );
    }
}
console.log(`${nBooks} book(s) loaded in ${(Date.now() - ts) / 1000} sec`);
ts = Date.now();

doRender(pk, config).then(() => {
});

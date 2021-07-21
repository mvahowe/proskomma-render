// node make_epub.js config_nfc18.json out.epub

const fse = require('fs-extra');
const path = require('path');

const {Proskomma} = require('proskomma');
const doModelQuery = require('../model_query');
const GlossaryScanDocSet = require('./GlossaryScanDocSet');
const MainDocSet = require('./MainDocSet');
const ScriptureParaModel = require('../ScriptureParaModel');

const bookMatches = str => {
    for (const book of config.bookSources) {
        if (str.includes(book) || str.includes(book.toLowerCase())) {
            return true;
        }
    }
    return false;
}

const peripheralMatches = str => {
    for (const periph of config.peripheralSources) {
        if (str.includes(periph) || str.includes(periph.toLowerCase())) {
            return true;
        }
    }
    return false;
}

const doGlossaryScan = (config, result) => {
    ts = Date.now();
    const model = new ScriptureParaModel(result, config);
    model.addDocSetModel('default', new GlossaryScanDocSet(result, model.context, config));
    model.render();
    console.log(`Glossary Scan in  ${(Date.now() - ts) / 1000} sec`);
    console.log(model.logString());
}

const doMainEpubRender = (config, result) => {
    ts = Date.now();
    const model = new ScriptureParaModel(result, config);
    model.addDocSetModel('default', new MainDocSet(result, model.context, config));
    model.render();
    console.log(`Main ePub rendered in  ${(Date.now() - ts) / 1000} sec`);
    console.log(model.logString());
}

const doRender = async (pk, config) => {
    const thenFunction = result => {
        console.log(`Query processed in  ${(Date.now() - ts) / 1000} sec`);
        doGlossaryScan(config, result);
        doMainEpubRender(config, result);
    }
    await doModelQuery(pk)
        .then(thenFunction)
};

if (process.argv.length !== 4) {
    console.log("USAGE: node make_epub.js <config_path> <output_path>");
    process.exit(1);
}
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
let nPeriphs = 0;

const pk = new Proskomma();
const fqSourceDir = path.resolve(config.configRoot, config.sourceDir);
for (const filePath of fse.readdirSync(fqSourceDir)) {
    if (bookMatches(filePath)) {
        console.log(`   Book ${filePath}`);
        nBooks++;
        let content = fse.readFileSync(path.join(fqSourceDir, filePath));
        const contentType = filePath.split('.').pop();
        pk.importDocument(
            {lang: "xxx", abbr: "yyy"},
            contentType,
            content,
            {}
        );
    } else if (peripheralMatches(filePath)) {
        console.log(`   Peripheral ${filePath}`);
        nPeriphs++;
        let content = fse.readFileSync(path.join(fqSourceDir, filePath));
        pk.importUsfmPeriph(
            { lang: 'xxx', abbr: 'yyy' },
            content,
            {},
        );
    }
}
console.log(`${nBooks} book(s) and ${nPeriphs} peripheral file(s) loaded in ${(Date.now() - ts) / 1000} sec`);
ts = Date.now();

doRender(pk, config).then(() => {
});

// node make_epub.js config_nfc18.json out.epub

const fse = require('fs-extra');
const path = require('path');

const {ProsKomma} = require('proskomma');
const doModelQuery = require('../model_query');
const renderModel = require('../xhtmlResultModel');

const bookMatches = str => {
    for (const book of config.books) {
        if (str.includes(book) || str.includes(book.toLowerCase())) {
            return true;
        }
    }
    return false;
}

const doRender = async (pk, config) => {
    await doModelQuery(pk)
        .then(result => {
                console.log(`Query processed in  ${(Date.now() - ts)/1000} sec`);
                ts = Date.now();
                const model = new renderModel(result, config);
                model.render();
                console.log(`Query result rendered in  ${(Date.now() - ts)/1000} sec`);
            }
        )
};

const configPath = path.resolve(__dirname, process.argv[2]);
const config = fse.readJsonSync(configPath);
config.configRoot = path.dirname(configPath);
config.sourceDir = path.resolve(__dirname, config.sourceDir);
config.outputPath = process.argv[3];
if (!config.outputPath) {
    throw new Error("USAGE: node make_epub.js config_nfc18.json out.epub");
}

let ts = Date.now();
let nBooks = 0;

const pk = new ProsKomma();
for (const filePath of fse.readdirSync(config.sourceDir)) {
    if (bookMatches(filePath)) {
        nBooks++;
        const content = fse.readFileSync(path.join(config.sourceDir, filePath));
        const contentType = filePath.split('.').pop();
        pk.importDocument(
            {lang: "xxx", abbr: "yyy"},
            contentType,
            content,
            {}
        );
    }
}
console.log(`${nBooks} book(s) loaded in ${(Date.now() - ts)/1000} sec`);
ts = Date.now();

doRender(pk, config).then(() => {});

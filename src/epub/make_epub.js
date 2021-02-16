// make_epub config.json

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
                const model = new renderModel(result, config);
                model.render();
            }
        )
};

// Read config file
const configPath = path.resolve(__dirname, process.argv[2]);
const config = fse.readJsonSync(configPath);
config.sourceDir = path.resolve(__dirname, config.sourceDir);
config.epubDir = path.resolve(__dirname, config.epubDir);

// Set up epub directory structure
fse.ensureDirSync(path.join(config.epubDir, "META-INF"));
fse.ensureDirSync(path.join(config.epubDir, "OEBPS", "XHTML"));
for (const book of config.books) {
    fse.ensureDirSync(path.join(config.epubDir, "OEBPS", "XHTML", book));
}
fse.ensureDirSync(path.join(config.epubDir, "OEBPS", "CSS"));
fse.writeFileSync(path.join(config.epubDir, "mimetype"), "application/epub+zip");
const css = fse.readFileSync(path.resolve(__dirname, 'styles.css'));
fse.writeFileSync(path.join(config.epubDir, "OEBPS", "CSS", "styles.css"), css);

// Load books
const pk = new ProsKomma();
for (const filePath of fse.readdirSync(config.sourceDir)) {
    if (bookMatches(filePath)) {
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

// Do query and rendering
doRender(pk, config).then(() => {
    console.log()
});
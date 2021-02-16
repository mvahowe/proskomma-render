// node make_epub.js config_nfc18.json out.epub

const fse = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');

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

const zip = new JSZip();

// Read and customize config file
const configPath = path.resolve(__dirname, process.argv[2]);
const config = fse.readJsonSync(configPath);
config.sourceDir = path.resolve(__dirname, config.sourceDir);

// Get output path
const outputPath = process.argv[3];
if (!outputPath) {
    throw new Error("USAGE: node make_epub.js config_nfc18.json out.epub");
}

// Set up directories and standard files in zip
zip.file("mimetype", "application/epub+zip");
const metaDir = zip.folder("META-INF");
metaDir.file("container.xml", fse.readFileSync(path.resolve(__dirname, 'container.xml')));
const oebpsDir = zip.folder("OEBPS");
const cssDir = oebpsDir.folder("CSS");
cssDir.file("styles.css", fse.readFileSync(path.resolve(__dirname, 'styles.css')));
config.zip = zip;

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
    // Build OPF file
    let opf = fse.readFileSync(path.resolve(__dirname, 'content.opf'), 'utf8');
    opf = opf.replace(/%title%/g, config.title);
    opf = opf.replace(/%uid%/g, config.uid);
    opf = opf.replace(/%language%/g, config.language);
    opf = opf.replace(/%timestamp%/g, new Date().toISOString().replace(/\.\d+Z/g, "Z"));
    opf = opf.replace(/%spine%/g, config.books.map(b => `<itemref idref="body_${b}" />\n`).join(""));
    opf = opf.replace(/%book_manifest_items%/g, config.books.map(b => `<item id="body_${b}" href="../OEBPS/XHTML/${b}/${b}.xhtml" media-type="application/xhtml+xml" />`).join(""));
    oebpsDir.file("content.opf", opf);
    let toc = fse.readFileSync(path.resolve(__dirname, 'toc.xhtml'), 'utf8');
    toc = toc.replace(/%contentLinks%/g, config.books.map(b => `<li><a href="${b}/${b}.xhtml">${b}</a></li>\n`).join(""));
    oebpsDir.file("XHTML/toc.xhtml", toc);
// Write out zip
    zip.generateNodeStream({type: "nodebuffer", streamFiles: true})
        .pipe(fse.createWriteStream(outputPath))
        .on('finish', function() {console.log("done")});
});
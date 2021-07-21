const fse = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');

const ScriptureDocSet = require('../ScriptureDocSet');
const MainEpubDocument = require('./CanonicalDocument');
const GlossaryEpubDocument = require('./GlossaryDocument');
const PeripheralEpubDocument = require('./PeripheralDocument');

class MainDocSet extends ScriptureDocSet {

    constructor(result, context, config) {
        super(result, context, config);
        this.zip = null;
        this.bookTitles = {};
        this.glossaryLemma = null;
        addActions(this);
    }

    modelForDocument(document) {
        const bookCode = document.headers.filter(h => h.key === 'bookCode')[0];
        if (bookCode && bookCode.value === 'GLO') {
            return 'glossary';
        } else if (bookCode && bookCode.value.startsWith('P')) {
            return 'peripheral';
        } else {
            return 'default';
        }
    }
}

const addActions = (dsInstance) => {
    const dInstance = new MainEpubDocument(dsInstance.result, dsInstance.context, dsInstance.config);
    const gDInstance = new GlossaryEpubDocument(dsInstance.result, dsInstance.context, dsInstance.config);
    const pDInstance = new PeripheralEpubDocument(dsInstance.result, dsInstance.context, dsInstance.config);
    dsInstance.addDocumentModel('default', dInstance);
    dsInstance.addDocumentModel('glossary', gDInstance);
    dsInstance.addDocumentModel('peripheral', pDInstance);
    dsInstance.addAction(
        'startDocSet',
        () => true,
        (renderer) => {
            renderer.bookTitles = {};
            renderer.zip = new JSZip();
            renderer.zip.file("mimetype", "application/epub+zip");
            renderer.zip.file("META-INF/container.xml", fse.readFileSync(path.resolve(dsInstance.config.codeRoot, 'resources/container.xml')));
            renderer.zip.file("OEBPS/CSS/styles.css", fse.readFileSync(path.resolve(dsInstance.config.codeRoot, 'resources/styles.css')));
            const coverImagePath = dsInstance.config.coverImage ?
                path.resolve(dsInstance.config.configRoot, dsInstance.config.coverImage) :
                path.resolve(dsInstance.config.codeRoot, 'resources/cover.png');
            const coverImageSuffix = coverImagePath.split("/").reverse()[0].split(".")[1];
            dsInstance.config.coverImageSuffix = coverImageSuffix;
            renderer.zip.file(`OEBPS/IMG/cover.${coverImageSuffix}`, fse.readFileSync(path.resolve(dsInstance.config.configRoot, coverImagePath)));
        }
    );
    dsInstance.addAction(
        'endDocSet',
        () => true,
        (renderer) => {
            const canonicalBooks = renderer.config.bookSources.filter(b => b in renderer.bookTitles);
            let opf = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/content.opf'), 'utf8');
            opf = opf.replace(/%title%/g, renderer.config.title);
            opf = opf.replace(/%uid%/g, renderer.config.uid);
            opf = opf.replace(/%language%/g, renderer.config.language);
            opf = opf.replace(/%timestamp%/g, new Date().toISOString().replace(/\.\d+Z/g, "Z"));
            opf = opf.replace(/%coverImageSuffix%/g, renderer.config.coverImageSuffix);
            opf = opf.replace(/%coverImageMimetype%/g, renderer.config.coverImageSuffix === "png" ? "image/png" : "image/jpeg");
            let spineContent = canonicalBooks.map(b => `<itemref idref="body_${b}" />\n`).join("");
            if (renderer.config.bookSources.includes("GLO")) {
                spineContent = spineContent.concat(`<itemref idref="body_GLO" />\n`);
                spineContent = spineContent.concat(`<itemref idref="body_glossary_notes" linear="no" />\n`);
            }
            opf = opf.replace(/%spine%/g, spineContent);
            let manifestContent = canonicalBooks.map(b => `<item id="body_${b}" href="XHTML/${b}/${b}.xhtml" media-type="application/xhtml+xml" />`).join("");
            if (renderer.config.bookSources.includes("GLO")) {
                manifestContent = manifestContent.concat(`<item id="body_GLO" href="XHTML/GLO.xhtml" media-type="application/xhtml+xml" />`);
                manifestContent = manifestContent.concat(`<item id="body_glossary_notes" href="XHTML/glossary_notes.xhtml" media-type="application/xhtml+xml" />`);
            }
            opf = opf.replace(/%book_manifest_items%/g, manifestContent);
            renderer.zip.file("OEBPS/content.opf", opf);
            let title = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/title.xhtml'), 'utf8');
            title = title.replace(/%titlePage%/g, renderer.config.i18n.titlePage);
            title = title.replace(/%copyright%/g, renderer.config.i18n.copyright);
            title = title.replace(/%coverAlt%/g, renderer.config.i18n.coverAlt);
            title = title.replace(/%coverImageSuffix%/g, renderer.config.coverImageSuffix);
            renderer.zip.file("OEBPS/XHTML/title.xhtml", title);
            let toc = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/toc.xhtml'), 'utf8');
            let tocContent = canonicalBooks
                .map(
                    b => `<li><a href="XHTML/${b}/${b}.xhtml">${renderer.bookTitles[b][2]}</a></li>\n`
                );
            if (renderer.config.bookSources.includes("GLO")) {
                tocContent.push(`<li><a href="XHTML/GLO.xhtml">${renderer.config.i18n.glossary}</a></li>\n`);
            }
            toc = toc.replace(/%contentLinks%/g, tocContent.join(""));
            toc = toc.replace(/%toc_books%/g, renderer.config.i18n.tocBooks)
            renderer.zip.file("OEBPS/toc.xhtml", toc);
            renderer.zip.generateNodeStream({type: "nodebuffer", streamFiles: true})
                .pipe(fse.createWriteStream(renderer.config.outputPath));
        }
    );
}

module.exports = MainDocSet;

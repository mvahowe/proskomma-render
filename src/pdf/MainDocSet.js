const fse = require('fs-extra');
const path = require('path');

const ScriptureDocSet = require('../ScriptureDocSet');
const MainDocument = require('./CanonicalDocument');

class MainDocSet extends ScriptureDocSet {

    constructor(result, context, config) {
        super(result, context, config);
        this.frontOutput = [];
        this.bodyOutput = [];
        this.backOutput = [];
        this.bookTitles = {};
        this.output = '';
        addActions(this);
    }

    modelForDocument(document) {
        return 'default';
    }
}

const addActions = (dsInstance) => {
    const dInstance = new MainDocument(dsInstance.result, dsInstance.context, dsInstance.config);
    dsInstance.addDocumentModel('default', dInstance);
    dsInstance.addAction(
        'endDocSet',
        () => true,
        (renderer) => {
            let startHTML = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/startHTML.html'), 'utf8');
            startHTML = startHTML.replace(/%titlePage%/g, renderer.config.i18n.titlePage);
            renderer.frontOutput.push(startHTML);
            const canonicalBooks = renderer.config.books.filter(b => b in renderer.bookTitles);
            let title = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/title.xhtml'), 'utf8');
            title = title.replace(/%titlePage%/g, renderer.config.i18n.titlePage);
            title = title.replace(/%copyright%/g, renderer.config.i18n.copyright);
            renderer.frontOutput.push(title);
            let toc = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/toc.xhtml'), 'utf8');
            let tocContent = canonicalBooks
                .map(
                    b => `<li><a href="#title_${b}">${renderer.bookTitles[b][2]}</a></li>\n`
                );
            toc = toc.replace(/%contentLinks%/g, tocContent.join(""));
            toc = toc.replace(/%toc_books%/g, renderer.config.i18n.tocBooks);
            renderer.frontOutput.push(toc);
            let bodyOutput = canonicalBooks.map(b => renderer.config.bookOutput[b]).join('');
            let endHTML = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/endHTML.html'), 'utf8');
            renderer.backOutput.push(endHTML);
            fse.writeFileSync(
                renderer.config.outputPath,
                `${renderer.frontOutput.join('\n')}\n${bodyOutput}\n${renderer.backOutput.join('\n')}`
            );
        }
    );
}

module.exports = MainDocSet;

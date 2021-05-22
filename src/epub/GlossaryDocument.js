const ScriptureDocument = require('../ScriptureDocument');
const sharedActions = require('./shared_actions');

class GlossaryDocument extends ScriptureDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.head = [];
        this.bodyHead = [];
        this.body = [];
        this.glossaryTerms = [];
        this.glossaryNs = [];
        addActions(this);
    }
}

const addActions = (dInstance) => {
    // Initialize headers
    dInstance.addAction(
        'startDocument',
        () => true,
        renderer => {
            renderer.config.glossaryAsides = [];
            renderer.config.glossaryNToAside = {};
            let cssPath = "../CSS/styles.css";
            dInstance.head = [
                '<meta charset=\"utf-8\"/>\n',
                `<link type="text/css" rel="stylesheet" href="${cssPath}" />\n`,
                `<title>${renderer.config.i18n.glossary}</title>`,
            ];
            dInstance.body = [];
            dInstance.bodyHead = [];
        }
    );
    // Start new stack row for new block
    dInstance.addAction(...sharedActions.startBlock);
    // Push rendered stack row content to glossary body, store content for page links, then pop row
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === 'main',
        renderer => {
            const glossContent = renderer.topStackRow().join("")
                .trim()
                .replace(/^[\s,]+/g, '');
            renderer.body.push(`<dd><p>${glossContent}</p></dd>\n`);
            const nAsides = renderer.config.glossaryAsides.length;
            if (renderer.glossaryNs.length > 0) {
                renderer.config.glossaryAsides.push({
                    n: nAsides,
                    numbers: renderer.glossaryNs,
                    terms: renderer.glossaryTerms,
                    content: [glossContent],
                });
            } else {
                renderer.config.glossaryAsides[nAsides - 1].content.push(glossContent);
            }
            renderer.glossaryNs.forEach(n => renderer.config.glossaryNToAside[n] = nAsides);
            renderer.popStackRow();
            renderer.glossaryNs = [];
            renderer.glossaryTerms = [];
        },
    );
    // End of a glossary term: check it's indexed,
    // then render the term to the glossary page directly
    dInstance.addAction(
        'scope',
        (context, data) => data.payload === "span/k" && data.subType === "end",
        renderer => {
            const glossaryTerm = renderer.topStackRow().join("");
            renderer.popStackRow();
            const glossaryN = renderer.config.glossaryTerms[glossaryTerm];
            if (glossaryN) {
                renderer.body.push(`<dt id="glo_${glossaryN}" class="k" epub:type="glossdef"><dfn>${glossaryTerm}</dfn></dt>`);
                renderer.glossaryNs.push(glossaryN);
                renderer.glossaryTerms.push(glossaryTerm);
            } else {
                console.log(`No match for '${glossaryTerm}'`);
                renderer.body.push(`<dt class="k"><dfn>${glossaryTerm}</dfn></dt>`);
            }
        }
    );
    // Character markup
    dInstance.addAction(...sharedActions.characterScope);
    // Unhandled scope
    dInstance.addAction(...sharedActions.unhandledScope);
    // Tokens, including attempt to add French spaces and half-spaces after punctuation
    dInstance.addAction(...sharedActions.token);
    // Build the HTML document
    dInstance.addAction(
        'endSequence',
        context => context.sequenceStack[0].type === "main",
        renderer => {
            let bodyHead = renderer.bodyHead.join("");
            renderer.docSetModel.zip
                .file(
                    "OEBPS/XHTML/GLO.xhtml",
                    [
                        `<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n<head>\n${renderer.head.join("")}\n</head>\n`,
                        '<body id="top">\n',
                        `<header>\n${bodyHead}\n</header>\n`,
                        `<section epub:type="glossary">\n`,
                        `<h1 class="mt">${renderer.config.i18n.glossary}</h1>\n`,
                        '<dl>\n',
                        renderer.body.join(""),
                        '</dl>\n',
                        `</section>\n`,
                        '</body>\n</html>\n'
                    ].join("")
                );
        }
    );
}

module.exports = GlossaryDocument;

const ScriptureDocument = require('../ScriptureDocument');

class GlossaryEpubDocument extends ScriptureDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.head = [];
        this.bodyHead = [];
        this.body = [];
        addActions(this);
    }
}

const addActions = (dInstance) => {
    // Initialize headers
    dInstance.addAction(
        'startDocument',
        () => true,
        renderer => {
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
    dInstance.addAction(
        'startBlock',
        () => true,
        renderer => renderer.pushStackRow(),
    );
    // Push rendered stack row content to body, then pop row
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === 'main',
        (renderer, context, data) => {
            renderer.body.push(`<dd><p>${renderer.topStackRow().join("").trim()}</p></dd>\n`);
            renderer.popStackRow();
        },
    );
    // End of a glossary term: check it's indexed, then render the term HTML directly
    dInstance.addAction(
        'scope',
        (context, data) => data.payload === "span/k" && data.subType === "end",
        renderer => {
            const spanContent = renderer.topStackRow().join("");
            const spanKey = spanContent;
            renderer.popStackRow();
            const glossaryN = renderer.config.glossaryTerms[spanKey];
            if (glossaryN) {
                renderer.body.push(`<dt id="glo_${glossaryN}" class="k" epub:type="glossdef"><dfn>${spanContent}</dfn></dt>`);
            } else {
                console.log(`No match for '${spanContent}'`);
                renderer.body.push(`<dt class="k"><dfn>${spanContent}</dfn></dt>`);
            }
        }
    );
    // Character markup - open or close an element
    dInstance.addAction(
        'scope',
        (context, data) => data.payload.startsWith("span") && ["bd", "bk", "dc", "em", "ft", "fq", "fqa", "fr", "fv", "it", "k", "ord", "pn", "qs", "sls", "tl", "wj", "xt"].includes(data.payload.split("/")[1]),
        (renderer, context, data) => {
            if (data.subType === "start") {
                renderer.pushStackRow();
            } else {
                const spanContent = renderer.topStackRow().join("");
                renderer.popStackRow();
                renderer.topStackRow().push(`<span class="${data.payload.split("/")[1]}">${spanContent}</span>`);
            }
        }
    );
    // Unhandled scope
    dInstance.addAction(
        'scope',
        (context, data) => data.payload.startsWith("span"),
        (renderer, context, data) => {
            if (data.subType === "start") {
                dInstance.writeLogEntry('Warning', `Unhandled span '${data.payload}'`)
            }
        }
    );
    // Tokens, including attempt to add French spaces and half-spaces after punctuation
    dInstance.addAction(
        'token',
        () => true,
        (renderer, context, data) => {
            let tokenString;
            if (["lineSpace", "eol"].includes(data.subType)) {
                tokenString = " ";
            } else {
                if ([";", "!", "?"].includes(data.payload)) {
                    if (renderer.topStackRow().length > 0) {
                        let lastPushed = renderer.topStackRow().pop();
                        lastPushed = lastPushed.replace(/ $/, "&#8239;");
                        renderer.appendToTopStackRow(lastPushed);
                    }
                    tokenString = data.payload;
                } else if ([":", "»"].includes(data.payload)) {
                    if (renderer.topStackRow().length > 0) {
                        let lastPushed = renderer.topStackRow().pop();
                        lastPushed = lastPushed.replace(/ $/, "&#160;");
                        renderer.appendToTopStackRow(lastPushed);
                    }
                    tokenString = data.payload;
                } else {
                    tokenString = data.payload.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }
            }
            return renderer.appendToTopStackRow(tokenString);
        }
    );
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
                        `<h1>${renderer.config.i18n.glossary}</h1>\n`,
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

module.exports = GlossaryEpubDocument;

const ScriptureDocument = require('../ScriptureDocument');

class GlossaryEpubDocument extends ScriptureDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.head = [];
        this.bodyHead = [];
        this.body = [];
        this.footnotes = {};
        this.nextFootnote = 1;
        this.glossaryLemma = null;
        this.chapter = {
            waiting: false,
            c: null,
            cp: null,
            ca: null,
            cc: 0
        };
        this.verses = {
            waiting: false,
            v: null,
            vp: null,
            va: null
        };
        addActions(this);
    }
}

const addActions = (dInstance) => {
    dInstance.addAction(
        'startDocument',
        () => true,
        (renderer, context) => {
            let cssPath = "../CSS/styles.css";
            dInstance.head = [
                '<meta charset=\"utf-8\"/>\n',
                `<link type="text/css" rel="stylesheet" href="${cssPath}" />\n`,
            ];
            dInstance.body = [];
            dInstance.bodyHead = [];
            dInstance.footnotes = {};
            dInstance.nextFootnote = 1;
            dInstance.chapter = {
                waiting: false,
                c: null,
                cp: null,
                cc: 0
            };
            dInstance.verses = {
                waiting: false,
                v: null,
                vp: null,
                vc: 0
            };
            dInstance.context.document.chapters = [];
        }
    );
    dInstance.addAction(
        'startSequence',
        context => context.sequenceStack[0].type === "main",
        (renderer, context) => renderer.head.push(`<title>"Vocabulaire"</title>`),
    );
    dInstance.addAction(
        'startBlock',
        context => true,
        renderer => renderer.pushStackRow(),
    );
    dInstance.addAction(
        'endBlock',
        context => ["main", "introduction"].includes(context.sequenceStack[0].type),
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split("/")[1];
            if (context.document.headers.bookCode === "GLO") {
                renderer.body.push(`<dd><p>${renderer.topStackRow().join("").trim()}</p></dd>\n`);
            } else {
                renderer.body.push(`<div class="${htmlClass}">${renderer.topStackRow().join("").trim()}</div>\n`);
            }
            renderer.popStackRow();
        },
    );
    dInstance.addAction(
        'scope',
        (context, data) => data.payload.startsWith("attribute/spanWithAtts/w/lemma"),
        (renderer, context, data) => {
            renderer.glossaryLemma = data.payload.split("/")[5];
        }
    );
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
    dInstance.addAction(
        'scope',
        (context, data) => data.payload === "spanWithAtts/w",
        (renderer, context, data) => {
            if (data.subType === "start") {
                renderer.pushStackRow();
                renderer.glossaryLemma = null;
            } else {
                const spanContent = renderer.topStackRow().join("");
                const spanKey = renderer.glossaryLemma || spanContent;
                renderer.popStackRow();
                renderer.topStackRow().push(spanContent);
                const glossaryN = renderer.config.glossaryTerms[spanKey];
                if (glossaryN) {
                    renderer.topStackRow().push(`<a epub:type="noteRef" class="glossaryLink" href="../GLO.xhtml#glo_${glossaryN}">*</a>`);
                }
            }
        }
    );
    dInstance.addAction(
        'scope',
        (context, data) => data.payload.startsWith("span"),
        (renderer, context, data) => {
            if (data.subType === "start") {
                dInstance.writeLogEntry('Warning', `Unhandled span '${data.payload}'`)
            }
        }
    );
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
    dInstance.addAction(
        'endSequence',
        context => context.sequenceStack[0].type === "main",
        (renderer, context) => {
            let chapterLinks = "<span class=\"chapter_link\"><a href=\"../toc.xhtml\">^</a></span>";
            chapterLinks += context.document.chapters.map(c => ` <span class="chapter_link"><a href="#chapter_${c[0]}">${c[1]}</a></span>`).join("");
            let bodyHead = renderer.bodyHead.join("");
            renderer.docSetModel.zip
                .file(
                    context.document.headers.bookCode !== "GLO" ?
                        `OEBPS/XHTML/${context.document.headers.bookCode}/${context.document.headers.bookCode}.xhtml` :
                        "OEBPS/XHTML/GLO.xhtml",
                    [
                        `<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n<head>\n${renderer.head.join("")}\n</head>\n`,
                        '<body id="top">\n',
                        context.document.chapters.length > 0 ? `<div class="chapter_nav">${chapterLinks}</div>\n` : "",
                        `<header>\n${bodyHead}\n</header>\n`,
                        `<section epub:type="glossary">\n`,
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

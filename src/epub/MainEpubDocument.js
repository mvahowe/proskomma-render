const ScriptureDocument = require('../ScriptureDocument');

class MainEpubDocument extends ScriptureDocument {

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

    maybeRenderChapter() {
        if (this.chapter.waiting) {
            const chapterLabel = this.chapter.cp || this.chapter.c;
            let chapterId = this.chapter.c;
            if (this.chapter.cpc > 0) {
                chapterId = `${chapterId}_${this.chapter.cpc}`;
            }
            this.context.document.chapters.push([chapterId, chapterLabel]);
            this.body.push(`<h3 id="chapter_${chapterId}" class="chapter"><a href="#top">${chapterLabel}</a></h3>\n`);
            this.chapter.waiting = false;
        }
    }

    maybeRenderVerse() {
        if (this.verses.waiting) {
            const verseLabel = this.verses.vp || this.verses.v;
            this.appendToTopStackRow(`<span class="verses">${verseLabel}</span>&#160;`);
            this.verses.waiting = false;
        }
    }
}

const addActions = (dInstance) => {
    dInstance.addAction(
        'startDocument',
        () => true,
        (renderer, context) => {
            let cssPath = "../../CSS/styles.css";
            dInstance.head = [
                '<meta charset=\"utf-8\"/>\n',
                `<link type="text/css" rel="stylesheet" href="${cssPath}" />\n`,
            ];
            dInstance.body = [];
            dInstance.bodyHead = [];
            dInstance.footnotes = {};
            dInstance.nextFootnote = 1;
            dInstance.docSetModel.bookTitles[context.document.headers.bookCode] = [
                context.document.headers.h,
                context.document.headers.toc,
                context.document.headers.toc2,
                context.document.headers.toc3,
            ];
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
        (renderer, context) => renderer.head.push(`<title>${context.document.headers.h || "Vocabulaire"}</title>`),
    );
    dInstance.addAction(
        'blockGraft',
        context => ["title", "heading", "introduction"].includes(context.sequenceStack[0].blockGraft.subType),
        (renderer, context, data) => {
            renderer.renderSequenceId(data.payload);
        }
    );
    dInstance.addAction(
        'startBlock',
        context => true,
        renderer => renderer.pushStackRow(),
    );
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === "title",
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split('/')[1];
            const tag = ["mt", "ms"].includes(htmlClass) ? "h1" : "h2";
            renderer.bodyHead.push(`<${tag} class="${htmlClass}">${renderer.topStackRow().join("").trim()}</${tag}>\n`);
            renderer.popStackRow();
        },
    );
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === "heading",
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split("/")[1];
            let headingTag;
            switch (htmlClass) {
                case "s":
                case "is":
                    headingTag = "h3";
                    break;
                default:
                    headingTag = "h4";
            }
            renderer.body.push(`<${headingTag} class="${htmlClass}">${renderer.topStackRow().join("").trim()}</${headingTag}>\n`);
            renderer.popStackRow();
        },
    );
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === "footnote",
        (renderer, context, data) => {
            const footnoteKey = renderer.nextFootnote.toString();
            if (!(footnoteKey in dInstance.footnotes)) {
                dInstance.footnotes[footnoteKey] = [];
            }
            dInstance.footnotes[footnoteKey] = dInstance.footnotes[footnoteKey].concat(renderer.topStackRow());
        },
    );
    dInstance.addAction(
        'endBlock',
        context => ["main", "introduction"].includes(context.sequenceStack[0].type),
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split("/")[1];
            renderer.body.push(`<div class="${htmlClass}">${renderer.topStackRow().join("").trim()}</div>\n`);
            renderer.popStackRow();
        },
    );
    dInstance.addAction(
        'scope',
        (context, data) => data.subType === 'start' && data.payload.startsWith("chapter/"),
        (renderer, context, data) => {
            dInstance.chapter.waiting = true;
            const chapterLabel = data.payload.split("/")[1];
            dInstance.chapter.c = chapterLabel;
            dInstance.chapter.cp = null;
            dInstance.chapter.cpc = 0;
            dInstance.chapter.ca = null;
            dInstance.chapter.cc++
        },
    );
    dInstance.addAction(
        'scope',
        (context, data) => data.subType === "start" && data.payload.startsWith("pubChapter/"),
        (renderer, context, data) => {
            dInstance.chapter.waiting = true;
            const chapterLabel = data.payload.split("/")[1];
            dInstance.chapter.cp = chapterLabel;
            dInstance.chapter.cpc++;
        }
    );
    dInstance.addAction(
        'scope',
        (context, data) => data.subType === 'start' && data.payload.startsWith("verses/"),
        (renderer, context, data) => {
            dInstance.verses.waiting = true;
            const verseLabel = data.payload.split("/")[1];
            dInstance.verses.v = verseLabel;
            dInstance.verses.vp = null;
            dInstance.verses.vc++;
        },
    );
    dInstance.addAction(
        'scope',
        (context, data) => data.subType === 'start' && data.payload.startsWith("pubVerse/"),
        (renderer, context, data) => {
            dInstance.verses.waiting = true;
            const verseLabel = data.payload.split("/")[1];
            dInstance.verses.vp = verseLabel;
            dInstance.verses.vc++;
        }
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
                if (context.sequenceStack[0].type === "main") {
                    dInstance.maybeRenderChapter();
                    dInstance.maybeRenderVerse();
                }
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
        'inlineGraft',
        (context, data) => data.subType === "footnote",
        (renderer, context, data) => {
            renderer.appendToTopStackRow(`<a epub:type="noteref" id="footnote_anchor_${renderer.nextFootnote}" href="#footnote_${renderer.nextFootnote}" class="footnote_anchor"><sup>${renderer.nextFootnote}</sup></a>`);
            renderer.renderSequenceId(data.payload);
            renderer.nextFootnote++;
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
                    `OEBPS/XHTML/${context.document.headers.bookCode}/${context.document.headers.bookCode}.xhtml`,
                    [
                        `<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n<head>\n${renderer.head.join("")}\n</head>\n`,
                        '<body id="top">\n',
                        context.document.chapters.length > 0 ? `<div class="chapter_nav">${chapterLinks}</div>\n` : "",
                        `<header>\n${bodyHead}\n</header>\n`,
                        `<section epub:type="bodymatter">\n`,
                        renderer.body.join(""),
                        `\n</section>\n`,
                        Object.keys(renderer.footnotes).length > 0 ?
                            `<section epub:type="footnotes">\n<h2 class="notes_title">${renderer.config.i18n.notes}</h2>\n` :
                            "",
                        Object.entries(renderer.footnotes)
                            .map(fe =>
                                `<aside epub:type="footnote">\n<p><a id="footnote_${fe[0]}" href="#footnote_anchor_${fe[0]}" class="footnote_number">${fe[0]}</a>&#160;: ${fe[1].join("")}</p></aside>\n`)
                            .join(""),
                        Object.keys(renderer.footnotes).length > 0 ?
                            `</section>\n` :
                            "",
                        '</body>\n</html>\n'
                    ].join("")
                );
        }
    );
    dInstance.addAction(
        'endSequence',
        context => context.sequenceStack[0].type === "introduction",
        renderer => {
            renderer.body.push("<hr/>\n");
        }
    );
}

module.exports = MainEpubDocument;

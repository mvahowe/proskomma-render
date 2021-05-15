const fse = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');

const ScriptureParaResultModel = require('../ScriptureParaModel');

class MainEpubModel extends ScriptureParaResultModel {

    constructor(result, config) {
        super(result);
        this.config = config;
        this.head = [];
        this.bodyHead = [];
        this.body = [];
        this.footnotes = {};
        this.nextFootnote = 1;
        this.zip = null;
        this.bookTitles = {};
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
        this.report = {
            unhandledSpans: new Set(),
        }
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

const addAction = (modelInstance, actionType, test, action) => {
    if (!(actionType in modelInstance.classActions)) {
        throw new Error(`Unknown action type '${actionType}'`);
    }
    modelInstance.classActions[actionType].push({test, action});
}

const addActions = (modelInstance) => {
    addAction(
        modelInstance,
        'startDocSet',
        () => true,
        (renderer) => {
            renderer.bookTitles = {};
            renderer.zip = new JSZip();
            renderer.zip.file("mimetype", "application/epub+zip");
            renderer.zip.file("META-INF/container.xml", fse.readFileSync(path.resolve(modelInstance.config.codeRoot, 'resources/container.xml')));
            renderer.zip.file("OEBPS/CSS/styles.css", fse.readFileSync(path.resolve(modelInstance.config.codeRoot, 'resources/styles.css')));
            const coverImagePath = modelInstance.config.coverImage ?
                path.resolve(modelInstance.config.configRoot, modelInstance.config.coverImage) :
                path.resolve(modelInstance.config.codeRoot, 'resources/cover.png');
            const coverImageSuffix = coverImagePath.split("/").reverse()[0].split(".")[1];
            modelInstance.config.coverImageSuffix = coverImageSuffix;
            renderer.zip.file(`OEBPS/IMG/cover.${coverImageSuffix}`, fse.readFileSync(path.resolve(modelInstance.config.configRoot, coverImagePath)));
        }
    );
    addAction(
        modelInstance,
        'startDocument',
        () => true,
        (renderer, context) => {
            let cssPath = "../../CSS/styles.css";
            if (context.document.headers.bookCode === "GLO") {
                cssPath = "../CSS/styles.css";
            }
            modelInstance.head = [
                '<meta charset=\"utf-8\"/>\n',
                `<link type="text/css" rel="stylesheet" href="${cssPath}" />\n`,
            ];
            modelInstance.body = [];
            modelInstance.bodyHead = [];
            modelInstance.footnotes = {};
            modelInstance.nextFootnote = 1;
            if (context.document.headers.bookCode !== "GLO") {
                modelInstance.bookTitles[context.document.headers.bookCode] = [
                    context.document.headers.h,
                    context.document.headers.toc,
                    context.document.headers.toc2,
                    context.document.headers.toc3,
                ];
            }
            modelInstance.chapter = {
                waiting: false,
                c: null,
                cp: null,
                cc: 0
            };
            modelInstance.verses = {
                waiting: false,
                v: null,
                vp: null,
                vc: 0
            };
            modelInstance.context.document.chapters = [];
        }
    );
    addAction(
        modelInstance,
        'startSequence',
        context => context.sequenceStack[0].type === "main",
        (renderer, context) => renderer.head.push(`<title>${context.document.headers.h || "Vocabulaire"}</title>`),
    );
    addAction(
        modelInstance,
        'blockGraft',
        context => ["title", "heading", "introduction"].includes(context.sequenceStack[0].blockGraft.subType),
        (renderer, context, data) => {
            renderer.renderSequenceId(data.payload);
        }
    );
    addAction(
        modelInstance,
        'startBlock',
        context => true,
        renderer => renderer.pushStackRow(),
    );
    addAction(
        modelInstance,
        'endBlock',
        context => context.sequenceStack[0].type === "title",
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split('/')[1];
            const tag = ["mt", "ms"].includes(htmlClass) ? "h1" : "h2";
            renderer.bodyHead.push(`<${tag} class="${htmlClass}">${renderer.topStackRow().join("").trim()}</${tag}>\n`);
            renderer.popStackRow();
        },
    );
    addAction(
        modelInstance,
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
    addAction(
        modelInstance,
        'endBlock',
        context => context.sequenceStack[0].type === "footnote",
        (renderer, context, data) => {
            const footnoteKey = renderer.nextFootnote.toString();
            if (!(footnoteKey in modelInstance.footnotes)) {
                modelInstance.footnotes[footnoteKey] = [];
            }
            modelInstance.footnotes[footnoteKey] = modelInstance.footnotes[footnoteKey].concat(renderer.topStackRow());
        },
    );
    addAction(
        modelInstance,
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
    addAction(
        modelInstance,
        'scope',
        (context, data) => data.subType === 'start' && data.payload.startsWith("chapter/") && context.document.headers.bookCode !== "GLO",
        (renderer, context, data) => {
            modelInstance.chapter.waiting = true;
            const chapterLabel = data.payload.split("/")[1];
            modelInstance.chapter.c = chapterLabel;
            modelInstance.chapter.cp = null;
            modelInstance.chapter.cpc = 0;
            modelInstance.chapter.ca = null;
            modelInstance.chapter.cc++
        },
    );
    addAction(
        modelInstance,
        'scope',
        (context, data) => data.subType === "start" && data.payload.startsWith("pubChapter/") && context.document.headers.bookCode !== "GLO",
        (renderer, context, data) => {
            modelInstance.chapter.waiting = true;
            const chapterLabel = data.payload.split("/")[1];
            modelInstance.chapter.cp = chapterLabel;
            modelInstance.chapter.cpc++;
        }
    );
    addAction(
        modelInstance,
        'scope',
        (context, data) => data.subType === 'start' && data.payload.startsWith("verses/"),
        (renderer, context, data) => {
            modelInstance.verses.waiting = true;
            const verseLabel = data.payload.split("/")[1];
            modelInstance.verses.v = verseLabel;
            modelInstance.verses.vp = null;
            modelInstance.verses.vc++;
        },
    );
    addAction(
        modelInstance,
        'scope',
        (context, data) => data.subType === 'start' && data.payload.startsWith("pubVerse/") && context.document.headers.bookCode !== "GLO",
        (renderer, context, data) => {
            modelInstance.verses.waiting = true;
            const verseLabel = data.payload.split("/")[1];
            modelInstance.verses.vp = verseLabel;
            modelInstance.verses.vc++;
        }
    );
    addAction(
        modelInstance,
        'scope',
        (context, data) => data.payload.startsWith("attribute/spanWithAtts/w/lemma"),
        (renderer, context, data) => {
            renderer.glossaryLemma = data.payload.split("/")[5];
        }
    );
    addAction(
        modelInstance,
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
    addAction(
        modelInstance,
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
    addAction(
        modelInstance,
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
    addAction(
        modelInstance,
        'scope',
        (context, data) => data.payload.startsWith("span"),
        (renderer, context, data) => {
            if (data.subType === "start") {
                renderer.report.unhandledSpans.add(data.payload);
            }
        }
    );
    addAction(
        modelInstance,
        'token',
        () => true,
        (renderer, context, data) => {
            let tokenString;
            if (["lineSpace", "eol"].includes(data.subType)) {
                tokenString = " ";
            } else {
                if (context.sequenceStack[0].type === "main") {
                    modelInstance.maybeRenderChapter();
                    modelInstance.maybeRenderVerse();
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
    addAction(
        modelInstance,
        'inlineGraft',
        (context, data) => data.subType === "footnote",
        (renderer, context, data) => {
            renderer.appendToTopStackRow(`<a epub:type="noteref" id="footnote_anchor_${renderer.nextFootnote}" href="#footnote_${renderer.nextFootnote}" class="footnote_anchor"><sup>${renderer.nextFootnote}</sup></a>`);
            renderer.renderSequenceId(data.payload);
            renderer.nextFootnote++;
        }
    );
    addAction(
        modelInstance,
        'endSequence',
        context => context.sequenceStack[0].type === "main",
        (renderer, context) => {
            let chapterLinks = "<span class=\"chapter_link\"><a href=\"../toc.xhtml\">^</a></span>";
            chapterLinks += context.document.chapters.map(c => ` <span class="chapter_link"><a href="#chapter_${c[0]}">${c[1]}</a></span>`).join("");
            let bodyHead = renderer.bodyHead.join("");
            renderer.zip
                .file(
                    context.document.headers.bookCode !== "GLO" ?
                        `OEBPS/XHTML/${context.document.headers.bookCode}/${context.document.headers.bookCode}.xhtml` :
                        "OEBPS/XHTML/GLO.xhtml",
                    [
                        `<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n<head>\n${renderer.head.join("")}\n</head>\n`,
                        '<body id="top">\n',
                        context.document.chapters.length > 0 ? `<div class="chapter_nav">${chapterLinks}</div>\n` : "",
                        `<header>\n${bodyHead}\n</header>\n`,
                        `<section epub:type="${context.document.headers.bookCode === "GLO" ? 'glossary' : 'bodymatter'}">\n`,
                        context.document.headers.bookCode === "GLO" ? '<dl>\n' : '',
                        renderer.body.join(""),
                        context.document.headers.bookCode === "GLO" ? '</dl>\n' : '',
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
    addAction(
        modelInstance,
        'endSequence',
        context => context.sequenceStack[0].type === "introduction",
        renderer => {
            renderer.body.push("<hr/>\n");
        }
    );
    addAction(
        modelInstance,
        'endDocSet',
        () => true,
        (renderer) => {
            const canonicalBooks = renderer.config.books.filter(b => b in renderer.bookTitles);
            let opf = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/content.opf'), 'utf8');
            opf = opf.replace(/%title%/g, renderer.config.title);
            opf = opf.replace(/%uid%/g, renderer.config.uid);
            opf = opf.replace(/%language%/g, renderer.config.language);
            opf = opf.replace(/%timestamp%/g, new Date().toISOString().replace(/\.\d+Z/g, "Z"));
            opf = opf.replace(/%coverImageSuffix%/g, renderer.config.coverImageSuffix);
            opf = opf.replace(/%coverImageMimetype%/g, renderer.config.coverImageSuffix === "png" ? "image/png" : "image/jpeg");
            let spineContent = canonicalBooks.map(b => `<itemref idref="body_${b}" />\n`).join("");
            if (renderer.config.books.includes("GLO")) {
                spineContent = spineContent.concat(`<itemref idref="body_GLO" />\n`);
            }
            opf = opf.replace(/%spine%/g, spineContent);
            let manifestContent = canonicalBooks.map(b => `<item id="body_${b}" href="../OEBPS/XHTML/${b}/${b}.xhtml" media-type="application/xhtml+xml" />`).join("");
            if (renderer.config.books.includes("GLO")) {
                manifestContent = manifestContent.concat(`<item id="body_GLO" href="../OEBPS/XHTML/GLO.xhtml" media-type="application/xhtml+xml" />`);
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
                    b => `<li><a href="${b}/${b}.xhtml">${renderer.bookTitles[b][2]}</a></li>\n`
                );
            if (renderer.config.books.includes("GLO")) {
                tocContent.push(`<li><a href="GLO.xhtml">${renderer.config.i18n.glossary}</a></li>\n`);
            }
            toc = toc.replace(/%contentLinks%/g, tocContent.join(""));
            toc = toc.replace(/%toc_books%/g, renderer.config.i18n.tocBooks)
            renderer.zip.file("OEBPS/XHTML/toc.xhtml", toc);
            renderer.zip.generateNodeStream({type: "nodebuffer", streamFiles: true})
                .pipe(fse.createWriteStream(renderer.config.outputPath));
        }
    );
}

module.exports = MainEpubModel;

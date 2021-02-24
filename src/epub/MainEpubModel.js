const fse = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');

const ScriptureParaResultModel = require('../scripture_para_result_model');

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
        this.classActions.startDocSet = [
            {
                test: () => true,
                action: (renderer) => {
                    renderer.bookTitles = {};
                    renderer.zip = new JSZip();
                    renderer.zip.file("mimetype", "application/epub+zip");
                    renderer.zip.file("META-INF/container.xml", fse.readFileSync(path.resolve(this.config.codeRoot, 'resources/container.xml')));
                    renderer.zip.file("OEBPS/CSS/styles.css", fse.readFileSync(path.resolve(this.config.codeRoot, 'resources/styles.css')));
                    const coverImagePath = this.config.coverImage ?
                        path.resolve(this.config.configRoot, this.config.coverImage) :
                        path.resolve(this.config.codeRoot, 'resources/cover.png');
                    const coverImageSuffix = coverImagePath.split("/").reverse()[0].split(".")[1];
                    this.config.coverImageSuffix = coverImageSuffix;
                    renderer.zip.file(`OEBPS/IMG/cover.${coverImageSuffix}`, fse.readFileSync(path.resolve(this.config.configRoot, coverImagePath)));
                },
            },
        ];
        this.classActions.startDocument = [
            {
                test: () => true,
                action: (renderer, context) => {
                    let cssPath = "../../CSS/styles.css";
                    if (context.document.headers.bookCode === "GLO") {
                        cssPath = "../CSS/styles.css";
                    }
                    this.head = [
                        '<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/>\n',
                        `<link type="text/css" rel="stylesheet" href="${cssPath}" />\n`,
                    ];
                    this.body = [];
                    this.bodyHead = [];
                    this.footnotes = {};
                    this.nextFootnote = 1;
                    if (context.document.headers.bookCode !== "GLO") {
                        this.bookTitles[context.document.headers.bookCode] = [
                            context.document.headers.h,
                            context.document.headers.toc,
                            context.document.headers.toc2,
                            context.document.headers.toc3,
                        ];
                    }
                    this.context.document.chapters = [];
                }
            },
        ];
        this.classActions.startSequence = [
            {
                test: context => context.sequenceStack[0].type === "main",
                action: (renderer, context) => renderer.head.push(`<title>${context.document.headers.h}</title>`),
            }
        ];
        this.classActions.blockGraft = [
            {
                test: context => ["title", "heading", "introduction"].includes(context.sequenceStack[0].blockGraft.subType),
                action: (renderer, context, data) => {
                    renderer.renderSequenceId(data.sequenceId);
                }
            }
        ];
        this.classActions.startBlock = [
            {
                test: context => true,
                action: renderer => renderer.pushStackRow(),
            }
        ];
        this.classActions.endBlock = [
            {
                test: context => context.sequenceStack[0].type === "title",
                action: (renderer, context, data) => {
                    const htmlClass = data.bs.label.split('/')[1];
                    const tag = ["mt"].includes(htmlClass) ? "h1" : "h2";
                    renderer.bodyHead.push(`<${tag} class="${htmlClass}">${renderer.topStackRow().join("").trim()}</${tag}>\n`);
                    renderer.popStackRow();
                },
            },
            {
                test: context => context.sequenceStack[0].type === "heading",
                action: (renderer, context, data) => {
                    const htmlClass = data.bs.label.split("/")[1];
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
            },
            {
                test: context => context.sequenceStack[0].type === "footnote",
                action: (renderer, context, data) => {
                    const footnoteKey = renderer.nextFootnote.toString();
                    if (!(footnoteKey in this.footnotes)) {
                        this.footnotes[footnoteKey] = [];
                    }
                    this.footnotes[footnoteKey] = this.footnotes[footnoteKey].concat(renderer.topStackRow());
                },
            },
            {
                test: context => ["main", "introduction"].includes(context.sequenceStack[0].type),
                action: (renderer, context, data) => {
                    const htmlClass = data.bs.label.split("/")[1];
                    renderer.body.push(`<div class="${htmlClass}">${renderer.topStackRow().join("").trim()}</div>\n`);
                    renderer.popStackRow();
                },
            },
        ];
        this.classActions.scope = [
            {
                test: (context, data) => data.itemType === "startScope" && data.label.startsWith("chapter/") && context.document.headers.bookCode !== "GLO",
                action: (renderer, context, data) => {
                    const chapterLabel = data.label.split("/")[1];
                    renderer.body.push(`<div id="chapter_${chapterLabel}" class="chapter"><a href="#top">${chapterLabel}</a></div>\n`);
                    renderer.context.document.chapters.push(chapterLabel);
                },
            },
            {
                test: (context, data) => data.itemType === "startScope" && data.label.startsWith("verses/") && !(data.label.endsWith("/1")),
                action: (renderer, context, data) => {
                    renderer.appendToTopStackRow(`<span class="verses">${data.label.split("/")[1]}</span>&#160;`);
                },
            },
            {
                test: (context, data) => data.label.startsWith("span") && ["bd", "bk", "em", "fq", "fqa", "fr", "k", "ord", "sls", "wj", "xt"].includes(data.label.split("/")[1]),
                action: (renderer, context, data) => {
                    if (data.itemType === "startScope") {
                        renderer.pushStackRow();
                    } else {
                        const spanContent = renderer.topStackRow().join("").trim();
                        renderer.popStackRow();
                        renderer.topStackRow().push(`<span class="${data.label.split("/")[1]}">${spanContent}</span>`);
                    }
                },
            },
        ];
        this.classActions.token = [
            {
                test: () => true,
                action: (renderer, context, data) => {
                    let tokenString;
                    if (["lineSpace", "eol"].includes(data.subType)) {
                        tokenString = " ";
                    } else if ([";", "!", "?"].includes(data.chars)) {
                        if (renderer.topStackRow().length > 0) {
                            let lastPushed = renderer.topStackRow().pop();
                            lastPushed = lastPushed.replace(/ $/, "&#8239;");
                            renderer.appendToTopStackRow(lastPushed);
                        }
                        tokenString = data.chars;
                    } else if ([":", "»"].includes(data.chars)) {
                        if (renderer.topStackRow().length > 0) {
                            let lastPushed = renderer.topStackRow().pop();
                            lastPushed = lastPushed.replace(/ $/, "&#160;");
                            renderer.appendToTopStackRow(lastPushed);
                        }
                        tokenString = data.chars;
                    } else {
                        tokenString = data.chars.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    }
                    return renderer.appendToTopStackRow(tokenString);
                },
            }
        ];
        this.classActions.inlineGraft = [
            {
                test: (context, data) => data.subType === "footnote",
                action: (renderer, context, data) => {
                    renderer.appendToTopStackRow(`<a id="footnote_anchor_${renderer.nextFootnote}" href="#footnote_${renderer.nextFootnote}" class="footnote_anchor">${renderer.nextFootnote}</a>`);
                    renderer.renderSequenceId(data.sequenceId);
                    renderer.nextFootnote++;
                },
            }
        ];
        this.classActions.endSequence = [
            {
                test: context => context.sequenceStack[0].type === "main",
                action: (renderer, context) => {
                    let chapterLinks = "<span class=\"chapter_link\"><a href=\"../toc.xhtml\">^</a></span>";
                    chapterLinks += context.document.chapters.map(c => `<span class="chapter_link"><a href="#chapter_${c}">${c}</a></span>`).join("");
                    let bodyHead = renderer.bodyHead.join("");
                    renderer.zip
                        .file(
                            context.document.headers.bookCode !== "GLO" ?
                                `OEBPS/XHTML/${context.document.headers.bookCode}/${context.document.headers.bookCode}.xhtml` :
                                "OEBPS/XHTML/GLO.xhtml",
                            [
                                `<html xmlns="http://www.w3.org/1999/xhtml">\n<head>\n${renderer.head.join("")}\n</head>\n`,
                                '<body id="top">\n',
                                context.document.chapters.length > 0 ? `<div class="chapter_nav">${chapterLinks}</div>` : "",
                                bodyHead,
                                renderer.body.join(""),
                                Object.keys(renderer.footnotes).length > 0 ?
                                    `<h2 class="notes_title">${renderer.config.i18n.notes}</h2>\n` :
                                    "",
                                Object.entries(renderer.footnotes)
                                    .map(fe =>
                                        `<div class="footnote"><a id="footnote_${fe[0]}" href="#footnote_anchor_${fe[0]}" class="footnote_number">${fe[0]}</a>&#160;: ${fe[1].join("")}</div>\n`)
                                    .join(""),
                                '</body>\n</html>\n'
                            ].join("")
                        );
                }
            }
        ];
        this.classActions.endDocSet = [
            {
                test: () => true,
                action: (renderer) => {
                    const canonicalBooks = this.config.books.filter(b => b in renderer.bookTitles);
                    let opf = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/content.opf'), 'utf8');
                    opf = opf.replace(/%title%/g, renderer.config.title);
                    opf = opf.replace(/%uid%/g, renderer.config.uid);
                    opf = opf.replace(/%language%/g, renderer.config.language);
                    opf = opf.replace(/%timestamp%/g, new Date().toISOString().replace(/\.\d+Z/g, "Z"));
                    opf = opf.replace(/%coverImageSuffix%/g, renderer.config.coverImageSuffix);
                    opf = opf.replace(/%coverImageMimetype%/g, renderer.config.coverImageSuffix === "png" ? "image/png" : "image/jpeg");
                    let spineContent = canonicalBooks.map(b => `<itemref idref="body_${b}" />\n`).join("");
                    if (config.books.includes("GLO")) {
                        spineContent = spineContent.concat(`<itemref idref="body_GLO" />\n`);
                    }
                    opf = opf.replace(/%spine%/g, spineContent);
                    let manifestContent = canonicalBooks.map(b => `<item id="body_${b}" href="../OEBPS/XHTML/${b}/${b}.xhtml" media-type="application/xhtml+xml" />`).join("");
                    if (config.books.includes("GLO")) {
                        manifestContent = manifestContent.concat(`<item id="body_GLO" href="../OEBPS/XHTML/GLO.xhtml" media-type="application/xhtml+xml" />`);
                    }
                    opf = opf.replace(/%book_manifest_items%/g, manifestContent);
                    renderer.zip.file("OEBPS/content.opf", opf);
                    let title = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/title.xhtml'), 'utf8');
                    title = title.replace(/%titlePage%/g, config.i18n.titlePage);
                    title = title.replace(/%copyright%/g, config.i18n.copyright);
                    title = title.replace(/%coverAlt%/g, config.i18n.coverAlt);
                    title = title.replace(/%coverImageSuffix%/g, renderer.config.coverImageSuffix);
                    renderer.zip.file("OEBPS/XHTML/title.xhtml", title);
                    let toc = fse.readFileSync(path.resolve(renderer.config.codeRoot, 'resources/toc.xhtml'), 'utf8');
                    let tocContent = canonicalBooks
                        .map(
                            b => `<li><a href="${b}/${b}.xhtml">${renderer.bookTitles[b][2]}</a></li>\n`
                        );
                    if (config.books.includes("GLO")) {
                        tocContent.push(`<li><a href="GLO.xhtml">${config.i18n.glossary}</a></li>\n`);
                    }
                    toc = toc.replace(/%contentLinks%/g, tocContent.join(""));
                    toc = toc.replace(/%toc_books%/g, config.i18n.tocBooks)
                    renderer.zip.file("OEBPS/XHTML/toc.xhtml", toc);
                    renderer.zip.generateNodeStream({type: "nodebuffer", streamFiles: true})
                        .pipe(fse.createWriteStream(renderer.config.outputPath));
                }
            }
        ]
    }

}

module.exports = MainEpubModel;
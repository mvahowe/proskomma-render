const fse = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');

const ScriptureParaResultModel = require('./scripture_para_result_model');

class XhtmlResultModel extends ScriptureParaResultModel {

    constructor(result, config) {
        super(result);
        this.config = config;
        this.head = [];
        this.body = [];
        this.footnotes = {};
        this.nextFootnote = 1;
        this.zip = null;
        this.classActions.startDocSet = [
            {
                test: () => true,
                action: (renderer) => {
                    renderer.zip = new JSZip();
                    renderer.zip.file("mimetype", "application/epub+zip");
                    renderer.zip.file("META-INF/container.xml", fse.readFileSync(path.resolve(this.config.configRoot, 'container.xml')));
                    renderer.zip.file("OEBPS/CSS/styles.css", fse.readFileSync(path.resolve(this.config.configRoot, 'styles.css')));

                },
            },
        ];
        this.classActions.startDocument = [
            {
                test: () => true,
                action: () => {
                    this.head = [
                        '<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/>\n',
                        '<link type="text/css" rel="stylesheet" href="../../CSS/styles.css" />\n',
                    ];
                    this.body = [];
                    this.footnotes = {};
                    this.nextFootnote = 1;
                },
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
                    renderer.body.push(`<${tag} class="${htmlClass}">${renderer.topStackRow().join("").trim()}</${tag}>\n`);
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
                            headingTag="h4";
                    };
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
                test: (context, data) => data.itemType === "startScope" && data.label.startsWith("chapter/"),
                action: (renderer, context, data) => {
                    renderer.body.push(`<div class="chapter">${data.label.split("/")[1]}</div>\n`);
                },
            },
            {
                test: (context, data) => data.itemType === "startScope" && data.label.startsWith("verses/") && !(data.label.endsWith("/1")),
                action: (renderer, context, data) => {
                    renderer.appendToTopStackRow(`<span class="verses">${data.label.split("/")[1]}</span>&#160;`);
                },
            },
        ];
        this.classActions.token = [
            {
                test: () => true,
                action: (renderer, context, data) =>
                    renderer.appendToTopStackRow(
                        ["lineSpace", "eol"].includes(data.subType) ?
                            " " :
                            data.chars.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    ),
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
                    renderer.zip
                        .file(
                            `OEBPS/XHTML/${context.document.headers.bookCode}/${context.document.headers.bookCode}.xhtml`,
                            [
                                `<html xmlns="http://www.w3.org/1999/xhtml">\n<head>\n${renderer.head.join("")}\n</head>\n`,
                                '<body>\n',
                                renderer.body.join(""),
                                `<h2 class="notes_title">${renderer.config.i18n.notes}</h2>\n`,
                                Object.entries(renderer.footnotes)
                                    .map(fe =>
                                        `<div><a id="footnote_${fe[0]}" href="#footnote_anchor_${fe[0]}" class="footnote_number">${fe[0]}</a>&#160;: ${fe[1].join("")}</div>\n`)
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
                    // Build OPF file
                    let opf = fse.readFileSync(path.resolve(renderer.config.configRoot, 'content.opf'), 'utf8');
                    opf = opf.replace(/%title%/g, renderer.config.title);
                    opf = opf.replace(/%uid%/g, renderer.config.uid);
                    opf = opf.replace(/%language%/g, renderer.config.language);
                    opf = opf.replace(/%timestamp%/g, new Date().toISOString().replace(/\.\d+Z/g, "Z"));
                    opf = opf.replace(/%spine%/g, renderer.config.books.map(b => `<itemref idref="body_${b}" />\n`).join(""));
                    opf = opf.replace(/%book_manifest_items%/g, renderer.config.books.map(b => `<item id="body_${b}" href="../OEBPS/XHTML/${b}/${b}.xhtml" media-type="application/xhtml+xml" />`).join(""));
                    renderer.zip.file("OEBPS/content.opf", opf);
                    let toc = fse.readFileSync(path.resolve(renderer.config.configRoot, 'toc.xhtml'), 'utf8');
                    toc = toc.replace(/%contentLinks%/g, config.books.map(b => `<li><a href="${b}/${b}.xhtml">${b}</a></li>\n`).join(""));
                    toc = toc.replace(/%toc_books%/g, config.i18n.tocBooks)
                    renderer.zip.file("OEBPS/XHTML/toc.xhtml", toc);
                    // Write out zip
                    renderer.zip.generateNodeStream({type: "nodebuffer", streamFiles: true})
                        .pipe(fse.createWriteStream(renderer.config.outputPath));
                }
            }
        ]
    }

}

module.exports = XhtmlResultModel;
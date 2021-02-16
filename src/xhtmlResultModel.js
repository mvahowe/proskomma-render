const fse = require('fs-extra');
const path = require('path');

const ScriptureParaResultModel = require('./scripture_para_result_model');

class XhtmlResultModel extends ScriptureParaResultModel {

    constructor(result, config) {
        super(result);
        this.config = config;
        this.head = [];
        this.body = [];
        this.footnotes = {};
        this.nextFootnote = 1;
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
                test: context => ["title", "heading"].includes(context.sequenceStack[0].blockGraft.subType),
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
                    const htmlClass = data.bs.label === "blockTag/mt" ? "mt" : "mt2";
                    renderer.body.push(`<div class="${htmlClass}">${renderer.topStackRow().join("").trim()}</div>\n`);
                    renderer.popStackRow();
                },
            },
            {
                test: context => context.sequenceStack[0].type === "heading",
                action: renderer => {
                    const headingTag = "h3";
                    renderer.body.push(`<${headingTag}>${renderer.topStackRow().join("").trim()}</${headingTag}>\n`);
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
                test: context => context.sequenceStack[0].type === "main",
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
                    renderer.appendToTopStackRow(`<span class="verses">${data.label.split("/")[1]}</span>&nbsp;`);
                },
            },
        ];
        this.classActions.token = [
            {
                test: () => true,
                action: (renderer, context, data) => renderer.appendToTopStackRow(["lineSpace", "eol"].includes(data.subType) ? " " : data.chars),
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

                    fse.writeFileSync(
                        path.join(this.config.epubDir, "OEBPS", "XHTML", context.document.headers.bookCode, `${context.document.headers.bookCode}.html`),
                        [
                            `<html>\n<head>\n${renderer.head.join("")}\n</head>\n`,
                            '<body>\n',
                            renderer.body.join(""),
                            '<h3>Notes</h3>\n',
                            Object.entries(renderer.footnotes)
                                .map(fe =>
                                    `<div><a id="footnote_${fe[0]}" href="#footnote_anchor_${fe[0]}" class="footnote_number">${fe[0]}</a>&nbsp;: ${fe[1].join("")}</div>\n`)
                                .join(""),
                            '</body>\n</html>\n'
                        ].join("")
                    )
                }
            }
        ];
    }

}

module.exports = XhtmlResultModel;
const ScriptureParaResultModel = require('./scripture_para_result_model');

class XhtmlResultModel extends ScriptureParaResultModel {

    constructor(result) {
        super(result);
        this.head = [];
        this.body = [];
        this.footnotes = {};
        this.nextFootnote = 1;
        this.classActions.startDocument = [
            {
                test: () => true,
                action: () => {
                    this.head = [
                        "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/>\n",
                        "<style type=\"text/css\">\n",
                        ".mt, .mt2 {text-align: center}\n",
                        ".mt {font-size: xx-large; font-weight: bold}\n",
                        ".mt2 {font-size: x-large}\n",
                        "h1, h2, h3 {margin-top: O.5em; margin-bottom: 0.2em}\n",
                        "h1 {font-size: xx-large}\n",
                        "h2 {font-size: x-large}\n",
                        "h3 {font-size: large}\n",
                        ".chapter {font-size: xx-large; padding-right: 0.25em; float: left}\n",
                        ".verses {font-size: small; font-weight: bold}\n",
                        ".p, .m {margin-bottom: 0.4em; margin-top: 0.4em}\n",
                        ".q, .q1, .pi {padding-left: 1.5em}\n",
                        ".q2 {padding-left: 2.5em}\n",
                        ".q3 {padding-left: 3.5em}\n",
                        ".footnote_anchor {font-size: small; font-family: italic; vertical-align: top}\n",
                        ".footnote_number {font-size: large; font-weight: bold}\n",
                        "* {font-size: medium}",
                        "</style>\n"
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
                action: renderer => {
                    console.log(`<html>\n<head>\n${renderer.head.join("")}\n</head>\n`);
                    console.log("<body>\n");
                    console.log(renderer.body.join(""));
                    console.log("<h3>Notes</h3>\n");
                    for (const [footnoteNo, footnoteContent] of Object.entries(renderer.footnotes)) {
                        console.log(`<div><a id="footnote_${footnoteNo}" href="#footnote_anchor_${footnoteNo}" class="footnote_number">${footnoteNo}</a>&nbsp;: ${footnoteContent.join("")}</div>\n`);
                    }
                    console.log("</body>\n</html>\n");
                }
            }
        ];
    }

}

module.exports = XhtmlResultModel;
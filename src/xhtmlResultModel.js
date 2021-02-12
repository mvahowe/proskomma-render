const ScriptureParaResultModel = require('./scripture_para_result_model');

class XhtmlResultModel extends ScriptureParaResultModel {

    constructor(result) {
        super(result);
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
            ".p {padding-bottom: 0.2em; padding-top: 0.2em}\n",
            ".q, .q1 {padding-left: 1.5em}\n",
            "* {font-size: medium}",
            "</style>\n"
        ];
        this.body = [];
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
                test: context => true,
                action: (renderer, context, data) => renderer.appendToTopStackRow(data.subType === "lineSpace" ? " ": data.chars),
            }
        ];
        this.classActions.endSequence = [
            {
                test: context => context.sequenceStack[0].type === "main",
                action: renderer => console.log(`<html>\n<head>\n${renderer.head.join("")}\n</head>\n<body>\n${renderer.body.join("")}</body>\n</html>\n`),
            }
        ];
    }

}

module.exports = XhtmlResultModel;
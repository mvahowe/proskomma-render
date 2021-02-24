const fse = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');

const ScriptureParaResultModel = require('../scripture_para_result_model');

class GlossaryScan extends ScriptureParaResultModel {

    constructor(result, config) {
        super(result);
        this.config = config;
        this.config.glossaryTerms = {};
        this.inK = false;

        this.classActions.scope = [
            {
                test: (context, data) => context.document.headers.bookCode === "GLO" && data.label === "span/k",
                action: (renderer, context, data) => {
                    if (data.itemType === "startScope") {
                        renderer.pushStackRow();
                        this.inK = true;
                    } else {
                        const kContent = renderer.popStackRow().join("").trim();
                        if (kContent in this.config.glossaryTerms) {
                            console.log(`WARNING: k value '${kContent}' used more than once`);
                        } else {
                            this.config.glossaryTerms[kContent] = Object.keys(this.config.glossaryTerms).length;
                        }
                        this.inK = false;
                    }
                },
            },
        ];
        this.classActions.token = [
            {
                test: () => this.inK,
                action: (renderer, context, data) => {
                    const tokenString = data.chars.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return renderer.appendToTopStackRow(tokenString);
                }
            },
        ];

    }
}

module.exports = GlossaryScan;
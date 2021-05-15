const ScriptureParaResultModel = require('../ScriptureParaModel');

class GlossaryScan extends ScriptureParaResultModel {

    constructor(result, config) {
        super(result);
        this.config = config;
        this.config.glossaryTerms = {};
        this.inK = false;
        addActions(this);
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
        'scope',
        (context, data) => context.document.headers.bookCode === "GLO" && data.payload === "span/k",
        (renderer, context, data) => {
            if (data.subType === "start") {
                renderer.pushStackRow();
                context.inK = true;
            } else {
                const kContent = renderer.popStackRow().join("").trim();
                if (kContent in renderer.config.glossaryTerms) {
                    console.log(`WARNING: k value '${kContent}' used more than once`);
                } else {
                    renderer.config.glossaryTerms[kContent] = Object.keys(renderer.config.glossaryTerms).length + 1;
                }
                context.inK = false;
            }
        }
    );
    addAction(
        modelInstance,
        'token',
        context => context.inK,
        (renderer, context, data) => {
            const tokenString = data.payload.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return renderer.appendToTopStackRow(tokenString);
        }
    );
}
module.exports = GlossaryScan;
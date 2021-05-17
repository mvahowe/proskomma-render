const ScriptureDocSet =require('./ScriptureDocSet');

class ScriptureParaModel {

    constructor(result, config) {
        this.queryResult = result;
        this.config = config;
        this.context = {};
        this.docSetModel = new ScriptureDocSet(result, this.context, this.config);
        this.classActionKeys = new Set([
            'startDocSet',
            'endDocSet',
            'startDocument',
            'endDocument',
            'startSequence',
            'endSequence',
            'startBlock',
            'endBlock',
            'blockGraft',
            'startItems',
            'endItems',
            'token',
            'scope',
            'inlineGraft',
            'startStackRow',
            'endStackRow',
        ]);
        this.allActions = {};
    }

    addAction(actionType, test, action) {
        if (!(this.classActionKeys.has(actionType))) {
            throw new Error(`Unknown action type '${actionType}'`);
        }
        this.docSetModel.addAction(actionType, test, action);
    }

    render(renderSpec) {
        renderSpec = renderSpec || {actions: {}};
        for (const docSet of this.queryResult.docSets) {
            if (renderSpec.docSet && renderSpec.docSet !== docSet.id) {
                continue;
            }
            this.docSetModel.render(docSet, this.config, renderSpec);
        }
        this.allActions = {};
    }
}

module.exports = ScriptureParaModel;

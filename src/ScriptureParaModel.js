class ScriptureParaModel {

    constructor(result, config) {
        this.queryResult = result;
        this.config = config;
        this.context = {};
        this.docSetModels = {};
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

    addDocSetModel(modelKey, model) {
        if (modelKey in this.docSetModels) {
            throw new Error(`A docSet model called '${modelKey}' has already been added`);
        }
        this.docSetModels[modelKey] = model;
    }

    addAction(actionType, test, action) {
        if (!(this.classActionKeys.has(actionType))) {
            throw new Error(`Unknown action type '${actionType}'`);
        }
        this.docSetModels.default.addAction(actionType, test, action);
    }

    modelForDocSet(docSet) {
        return 'default';
    }

    render(renderSpec) {
        renderSpec = renderSpec || {actions: {}};
        for (const docSet of this.queryResult.docSets) {
            if (renderSpec.docSet && renderSpec.docSet !== docSet.id) {
                continue;
            }
            this.docSetModels[this.modelForDocSet(docSet)].render(docSet, this.config, renderSpec);
        }
        this.allActions = {};
    }
}

module.exports = ScriptureParaModel;

class ScriptureParaModel {

    constructor(result, config) {
        this.queryResult = result;
        this.config = config;
        this.context = {};
        this.docSetModels = {};
        this.delegatedActionKeys = new Set([
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
        this.log = [];
    }

    logString() {
        return this.log.map(l => `${l.level} from ${l.component}: ${l.msg}`).join('\n');
    }

    addDocSetModel(modelKey, model) {
        if (modelKey in this.docSetModels) {
            throw new Error(`A docSet model called '${modelKey}' has already been added`);
        }
        this.docSetModels[modelKey] = model;
        model.scriptureModel = this;
        model.key = modelKey;
    }

    addAction(actionType, test, action) {
        if (!(this.delegatedActionKeys.has(actionType))) {
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
            const docSetKey = this.modelForDocSet(docSet);
            if (!(docSetKey in this.docSetModels)) {
                throw new Error(`Attempt to call unknown docSet model '${docSetKey}': maybe you forgot 'addDocSetModel()'?`);
            }
            this.docSetModels[docSetKey].render(docSet, this.config, renderSpec);
        }
        this.allActions = {};
    }
}

module.exports = ScriptureParaModel;

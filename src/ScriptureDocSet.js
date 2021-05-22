class ScriptureDocSet {

    constructor(result, context, config) {
        this.queryResult = result;
        this.context = context;
        this.config = config;
        this.documentModels = {};
        this.classActions = {
            startDocSet: [],
            endDocSet: [],
        }
        this.delegatedActionKeys = new Set([
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
        this.scriptureModel = null;
        this.key = null;
    }

    writeLogEntry(level, msg) {
        this.scriptureModel.log.push({
            component: `docSet${this.key === 'default' ? '' : `:${this.key}`}`,
            level,
            msg,
        })
    }

    addAction(actionType, test, action) {
        if (actionType in this.classActions) {
            this.classActions[actionType].push({test, action});
        } else if (this.delegatedActionKeys.has(actionType)) {
            this.documentModels.default.addAction(actionType, test, action);
        } else {
            throw new Error(`Unknown action type '${actionType}' in docSet`);
        }
    }

    addDocumentModel(modelKey, model) {
        if (modelKey in this.documentModels) {
            throw new Error(`A document model called '${modelKey}' has already been added`);
        }
        this.documentModels[modelKey] = model;
        model.docSetModel = this;
        model.key = modelKey;
    }

    applyClassActions(classActions, data) {
        for (const classAction of classActions) {
            if (classAction.test(this.context, data)) {
                classAction.action(this, this.context, data);
                break;
            }
        }
    }

    render(docSet, config, renderSpec) {
        for (const action of Object.keys(this.classActions)) {
            this.allActions[action] = (renderSpec.actions[action] || []).concat(this.classActions[action]);
        }
        this.context.docSet = {
            id: docSet.id,
            selectors: {},
            tags: docSet.tags
        }
        for (const selector of docSet.selectors) {
            this.context.docSet.selectors[selector.key] = selector.value;
        }
        this.renderStartDocSet(docSet);
        let documents = docSet.documents;
        const gloDocument = documents.filter(d => d.headers.filter(dh => dh.key === 'bookCode' && dh.value === 'GLO').length > 0);
        if (gloDocument) {
            documents = [gloDocument[0], ...documents.filter(d => d.id !== gloDocument[0].id)];
        }
        for (const document of documents) {
            if (renderSpec.document && renderSpec.document !== document.id) {
                continue;
            }
            this.renderDocument(document, renderSpec);
        }
        this.renderEndDocSet(docSet);
        delete this.context.docSet;
    }

    modelForDocument(document) {
        return 'default';
    }

    renderDocument(document, renderSpec) {
        renderSpec = renderSpec || {actions: {}};
            const documentKey = this.modelForDocument(document);
            if (!(documentKey in this.documentModels)) {
                throw new Error(`Attempt to call unknown document model '${documentKey}': maybe you forgot 'addDocumentModel()'?`);
            }
            this.documentModels[documentKey].render(document, this.config, renderSpec);
    }

    renderStartDocSet(docSet) {
        this.applyClassActions(this.allActions.startDocSet, docSet);
    }

    renderEndDocSet(docSet) {
        this.applyClassActions(this.allActions.endDocSet, docSet);
    }

}

module.exports = ScriptureDocSet;

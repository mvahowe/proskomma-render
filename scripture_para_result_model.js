class ScriptureParaResultModel {

    constructor(result) {
        this.queryResult = result;
        this.context = {};
        this.classActions = {
            renderStartSequence: [],
            renderEndSequence: [],
            renderStartBlock: [],
            renderEndBlock: [],
            renderBlockGraft: [],
            renderStartItems: [],
            renderEndItems: [],
            renderToken: [],
            renderScope: [],
            renderInlineGraft: []
        };
        this.allActions = {};
    }

    render(renderSpec) {
        renderSpec = renderSpec || {actions: {}};
        for (const action of Object.keys(this.classActions)) {
            this.allActions[action] = (renderSpec.actions[action] || []).concat(this.classActions[action]);
        }
        for (const docSet of this.queryResult.docSets) {
            if (renderSpec.docSet && renderSpec.docSet !== docSet.id) {
                continue;
            }
            this.context.docSet = {
                id: docSet.id,
                selectors: {},
                tags: docSet.tags
            }
            for (const selector of docSet.selectors) {
                this.context.docSet.selectors[selector.key] = selector.value;
            }
            for (const document of docSet.documents) {
                if (renderSpec.document && renderSpec.document !== document.id) {
                    continue;
                }
                this.context.document = {
                    id: document.id,
                    headers: {},
                    tags: document.tags
                };
                for (const header of document.headers) {
                    this.context.document.headers[header.key] = header.value;
                }
                this.context.sequences = {};
                for (const sequence of document.sequences) {
                    this.context.sequences[sequence.id] = sequence;
                    if (sequence.type === "main") {
                        this.context.mainSequence = sequence;
                    }
                }
                this.renderSequenceId(renderSpec.sequence || this.context.mainSequence.id);
                delete this.context.mainSequence;
                delete this.context.sequences;
            }
            delete this.context.document;
        }
        delete this.context.docSet;
        this.allActions = {};
    }

    renderSequenceId(sequenceId) {
        const sequence = this.context.sequences[sequenceId];
        this.context.sequence = {
            id: sequence.id,
            type: sequence.type,
            openScopes: []
        };
        this.renderStartSequence(sequence);
        this.renderBlocks(sequence.blocks);
        this.renderEndSequence(sequence);
        delete this.context.sequence;
    }

    renderBlocks(blocks) {
        for (const block of blocks) {
            this.renderStartBlock(block);
            this.renderBlockGrafts(block.bg);
            this.renderStartItems(block.items);
            this.renderItems(block.items);
            this.renderEndItems(block.items);
            this.renderEndBlock(block);
        }
    }

    renderBlockGrafts(blockGrafts) {
        for (const blockGraft of blockGrafts) {
            this.renderBlockGraft(blockGraft);
        }
    }

    renderItems(items) {
        for (const item of items) {
            this.renderItem(item);
        }
    }

    renderItem(item) {
        switch (item.itemType) {
            case "token":
                this.renderToken(item);
                break;
            case "startScope":
            case "endScope":
                this.renderScope(item);
                break;
            case "graft":
                this.renderInlineGraft(item);
                break;
        }
    };

    renderStartSequence(sequence) {}

    renderEndSequence(sequence) {}

    renderStartBlock(block) {};

    renderEndBlock(block) {};

    renderBlockGraft(blockGraft) {};

    renderStartItems(items) {};

    renderEndItems(items) {};

    renderToken(token) {};

    renderScope(scope) {};

    renderInlineGraft(graft) {};

}

module
    .exports = ScriptureParaResultModel;

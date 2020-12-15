class ScriptureParaResultModel {

    constructor(result) {
        this.queryResult = result;
        this.context = {};
        this.classActions = {
            startSequence: [],
            endSequence: [],
            startBlock: [],
            endBlock: [],
            blockGraft: [],
            startItems: [],
            endItems: [],
            token: [],
            scope: [],
            inlineGraft: []
        };
        this.allActions = {};
    }

    applyClassActions(classActions, data) {
        for (const classAction of classActions) {
            if (classAction.test(this.context, data)) {
                classAction.action(this, this.context, data);
                break;
            }
        }
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
                this.context.sequenceStack = [];
                this.renderSequenceId(renderSpec.sequence || this.context.mainSequence.id);
                delete this.context.sequenceStack;
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
        this.context.sequenceStack.unshift({
            id: sequence.id,
            type: sequence.type,
            openScopes: new Set([]),
            nBlocks: sequence.blocks.length
        });
        this.renderStartSequence(sequence);
        this.renderBlocks(sequence.blocks);
        this.renderEndSequence(sequence);
        this.context.sequenceStack.shift();
    }

    renderBlocks(blocks) {
        for (const [n, block] of blocks.entries()) {
            this.context.sequenceStack[0].block = {
                blockScope: block.bs.label,
                nBlockGrafts: block.bg.length,
                nItems: block.items.length,
                blockPos: n
            };
            this.renderStartBlock(block);
            this.renderBlockGrafts(block.bg);
            this.renderStartItems(block.items);
            this.renderItems(block.items);
            this.renderEndItems(block.items);
            this.renderEndBlock(block);
            delete this.context.sequenceStack[0].block;
        }
    }

    renderBlockGrafts(blockGrafts) {
        for (const blockGraft of blockGrafts) {
            this.renderBlockGraft(blockGraft);
        }
    }

    renderItems(items) {
        for (const [n, item] of items.entries()) {
            this.context.sequenceStack[0].item = {
                itemPos: n
            };
            this.renderItem(item);
            delete this.context.sequenceStack[0].item;
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

    renderStartSequence(sequence) {
        this.applyClassActions(this.allActions.startSequence, sequence);
    }

    renderEndSequence(sequence) {
        this.applyClassActions(this.allActions.endSequence, sequence);
    }

    renderStartBlock(block) {
        this.applyClassActions(this.allActions.startBlock, block);
    };

    renderEndBlock(block) {
        this.applyClassActions(this.allActions.endBlock, block);
    };

    renderBlockGraft(blockGraft) {
        this.context.sequenceStack[0].blockGraft = {
            subType: blockGraft.subType
        };
        this.applyClassActions(this.allActions.blockGraft, blockGraft);
        delete this.context.sequenceStack[0].blockGraft;
    };

    renderStartItems(items) {
        this.applyClassActions(this.allActions.startItems, items);
    };

    renderEndItems(items) {
        this.applyClassActions(this.allActions.endItems, items);
    };

    renderToken(token) {
        this.applyClassActions(this.allActions.token, token);
    };

    renderScope(scope) {
        if (scope.itemType === "startScope") {
            this.context.sequenceStack[0].openScopes.add(scope.label);
        }
        this.applyClassActions(this.allActions.scope, scope);
        if (scope.itemType === "endScope") {
            this.context.sequenceStack[0].openScopes.delete(scope.label);
        }
    };

    renderInlineGraft(graft) {
        this.applyClassActions(this.allActions.inlineGraft, graft);
    };

}

module.exports = ScriptureParaResultModel;

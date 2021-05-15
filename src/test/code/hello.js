const test = require('tape');

const {pkWithDoc} = require('../lib/load');
const doModelQuery = require('../../model_query');
const ScriptureParaModel = require("../../ScriptureParaModel");
const tokenActions = require("../../action_classes/token/consoleLog");
const blockGraftActions = require("../../action_classes/blockGraft/consoleLog");
const inlineGraftActions = require("../../action_classes/inlineGraft/consoleLog");
const endBlockActions = require("../../action_classes/endBlock/consoleLog");
const scopeActions = require("../../action_classes/scope/chapterVerse");

const testGroup = "The Basics";

const pk = pkWithDoc("../test_data/rut.usfm", {lang: "eng", abbr: "web"})[0];
// const pk = pkWithDoc("../../../../../sbf/nfc/usx/001GEN.usx", {lang: "fra", abbr: "nfc"})[0];

const renderHeading = {
    test: (context, data) => {
        return data.subType === "heading";
    },
    action: (renderer, context, data) => {
        process.stdout.write(`\n++ `);
        renderer.renderSequenceId(data.payload);
        process.stdout.write(` ++\n`);
    }
}

const headingEndBlock = {
    test: (context, data) => {
        return (context.sequenceStack.length > 1) && (context.sequenceStack[1].blockGraft) && (context.sequenceStack[1].blockGraft.subType === "heading")
    },
    action: () => {}
}

test(
    `Build a Model (${testGroup})`,
    async function (t) {
        try {
            t.plan(2);
            const result = await doModelQuery(pk);
            t.ok(result);
            const model = new ScriptureParaModel(result);
            t.ok(model);
            model.render({
                actions: {
                    token: tokenActions,
                    blockGraft: [renderHeading, ...blockGraftActions],
                    inlineGraft: inlineGraftActions,
                    endBlock: [headingEndBlock, ...endBlockActions],
                    scope: scopeActions
                }
            });
        } catch (err) {
            console.log(err)
        }
    }
);

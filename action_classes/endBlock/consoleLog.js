module.exports = [

    {
        test: (context, data) => {
            return (context.sequenceStack.length > 1) && context.sequenceStack[1].inlineGraft;
        },
        action: (renderer, context, data) => {}
    },

    {
        test: (context, data) => {
            return true;
        },
        action: (renderer, context, data) => {
            process.stdout.write("\n");
        }
    }

];
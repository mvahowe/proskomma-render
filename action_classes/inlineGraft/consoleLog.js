module.exports = [

    {
        test: (context, data) => {
            return true;
        },
        action: (renderer, context, data) => {
            process.stdout.write(` << ${data.subType} `);
            renderer.renderSequenceId(data.sequenceId);
            process.stdout.write(`>> `);
        }
    }

];
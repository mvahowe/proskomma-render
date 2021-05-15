module.exports = [

    {
        test: (context, data) => {
            return true;
        },
        action: (renderer, context, data) => {
            process.stdout.write(`\n>>\n*** ${data.subType} ***\n`);
            renderer.renderSequenceId(data.payload);
            process.stdout.write(`\n<<\n`);
        }
    }

];
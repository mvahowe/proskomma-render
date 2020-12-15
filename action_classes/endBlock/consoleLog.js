module.exports = [

    {
        test: (context, data) => {
            return true;
        },
        action: (renderer, context, data) => {
            process.stdout.write("\n");
        }
    }

];
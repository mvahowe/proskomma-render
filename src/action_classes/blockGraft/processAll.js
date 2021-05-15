module.exports = [

    {
        test: (context, data) => {
            return true;
        },
        action: (renderer, context, data) => {
            renderer.renderSequenceId(data.payload);
        }
    }

];
// =============================================================================
// LAWNMOWER
// =============================================================================
(function(output){

    function STRING_PATTERN() {
        return /["'].*['"]/;
    }

    function BOOLEAN_PATTERN() {
        return /true|false|yes|no/i;
    }

    function ECMASCRIPT_COMMENT_PATTERN() {
        return /((([^:]\/\/)|^\/\/).*)|(\/\*[\S\s]+?\*\/)/g;
    }

    function HTML_COMMENT_PATTERN() {
        return /\<![-]{2}[\S\s]*?[-]{2}\>/g;
    }

    function removeECMAScriptComments(input) {

        // Input was already parsed, return JSON version
        if (typeof input != "string") {
            return JSON.stringify(json);
        }

        // Remove all strings to ensure any comments in the strings are kept
        var strings = [],
            content = null,
            i       = 0;
        while((content = STRING_PATTERN().exec(input)) != null) {

            input = input.replace(STRING_PATTERN(), "#{" + i + "}");
            strings.push(content);

            i++;

        }

        // Replace comments with nothing
        input = input.replace(ECMASCRIPT_COMMENT_PATTERN(), "");

        // Refill string placeholders
        i = 0;
        while((/#\{(\d*)\}/).exec(input) != null) {

            i     = input.match(/#\{(\d*)\}/)[1];
            input = input.replace(/#\{(\d*)\}/, strings[i]);

        }

        return input;

    }

    function removeHTMLComments(input) {

        // Return null if the input isn't String format
        if (typeof input != "string") {
            return null;
        }

        // Replace comments with nothing and return
        return input.replace(HTML_COMMENT_PATTERN(), "");

    }

    function trim(input) {
        return input.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }

    output.removeECMAScriptComments = removeECMAScriptComments;
    output.removeHTMLComments       = removeHTMLComments;
    output.trim                     = trim;

})(exports);
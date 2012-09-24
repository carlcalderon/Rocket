// =============================================================================
// NOTATION
// =============================================================================
(function(output){

    var errors    = require("./errors"),
        warnings  = require("./warnings"),
        global    = require("./global"),
        lawnmower = require("./lawnmower"),
        path      = require("path"),
        fs        = require("fs"),

    ACTION_TYPE = {
        remove:  "remove",
        insert:  "insert",
        concat:  "concat",
        minify:  "minify",
        compile: "compile",
        replace: "replace" // DEPRECATED
    },

    FILE_SEPARATOR  = "\r\n",

    REGEXP_NOTATION = function() { return /<\!--\s?(rocket|sb):\s?([\S]+)\s?([\s\S]*?)\s?-->([\s\S]*?)<\!--\s?end\s?-->/gm; },
    REGEXP_SCRIPT   = function() { return /script.+src="(.+)"/g; },
    REGEXP_LINK     = function() { return /link.+href="(.+)"/g; },
    REGEXP_TRIM     = function() { return /(\S+)/g; },
    REGEXP_MATCH    = function() { return /^\.m?[xsd]?(((gm|htm|m)l?)|(svg|ant))$/i; };

    function match(filepath) {

        return (REGEXP_MATCH().exec(path.extname(filepath)) != null);

    }

    function parse(input, filepath, limit) {

        var match       = null,
            all         = null,
            type        = null,
            action      = null,
            target      = null,
            block       = null,
            markup      = null,
            filecontent = null,
            minify      = null,
            compile     = null,
            scripts     = null,
            links       = null,
            sources     = null,
            count       = 0,
            found       = false,
            result      = {
                errors: [],
                warnings: [],
                markup: input,
                minify: false,
                compile: false,
                files: []
            };

        if (!limit) {

            limit = 1024;

        }

        if (typeof input == "string") {

            if (input.length > 0) {

                while ((match = REGEXP_NOTATION().exec(result.markup)) !== null && count++ < limit) {
                    all     = match[0];
                    type    = match[1];
                    action  = match[2].toLowerCase();
                    target  = match[3];
                    block   = match[4];
                    minify  = false;
                    compile = false;
                    found   = true;
                    markup  = "";
                    switch (action) {

                        case ACTION_TYPE.remove :

                            markup = "";

                            break;

                        case ACTION_TYPE.insert :

                            // Split each line between start and end notation blocks
                            var rows = global.splitLines(block),
                                row  = null,
                                len  = rows.length,
                                i    = 0;

                            // Insert file contents of each line (file)
                            for ( ; i < len; i++) {

                                // Extract one row and clean it
                                row = lawnmower.trim(rows[i]);

                                // Ignore empty rows
                                if (row != null && row != "") {

                                    // find the file
                                    row = path.resolve(path.dirname(filepath), row);

                                    if (fs.existsSync(row) == true) {

                                        sources = sources || [];

                                        try {

                                            sources.push(row);
                                            filecontent = fs.readFileSync(row, "utf8");

                                        } catch (error) {

                                            // error and return

                                        }

                                        markup += filecontent + FILE_SEPARATOR;

                                    }

                                }

                            }

                            break;

                        case ACTION_TYPE.minify :

                            minify = true;

                        case ACTION_TYPE.compile :

                            compile = true;

                        case ACTION_TYPE.concat :

                            scripts = block.match(REGEXP_SCRIPT());
                            links   = block.match(REGEXP_LINK());
                            sources = [];

                            var len = 0,
                                i   = 0,
                                base = path.dirname(filepath);

                            if (scripts != null) {

                                for (i = 0, len = scripts.length; i < len; i++) {

                                    sources.push(path.resolve(base, REGEXP_SCRIPT().exec(scripts[i])[1]));

                                };

                                markup = "<script type=\"text/javascript\" src=\"" + target + "\"></script>";

                            }
                            if (links != null) {

                                for (i = 0, len = links.length; i < len; i++) {

                                    sources.push(path.resolve(base, REGEXP_LINK().exec(links[i])[1]));

                                };

                                markup = "<link rel=\"stylesheet\" type=\"text/css\" href=\"" + target + "\">";

                            }

                            break;

                        default:

                            result.warnings.push({
                                id: warnings.INVALID_NOTATION,
                                reason: "Notation action \"" + action + "\" is invalid."
                            });

                            break;
                    }

                    //console.log(all, markup);
                    result.markup  = result.markup.replace(all, markup);

                }

                result.minify  = minify;
                result.compile = compile;
                result.files   = sources;

            } else {

                result.warnings.push({
                    id: warnings.EMPTY_INPUT,
                    reason: "Notation input is empty."
                });

            }

        } else {

            result.errors.push({
                id: errors.INVALID_ARGUMENT,
                reason: "notation.parse input must be a \"String\"."
            });

            return result;

        }

        if (found) {

            return result;

        }

        return null;

    }

    output.parse = parse;
    output.match = match;

})(exports);
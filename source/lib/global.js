// =============================================================================
// GLOBAL METHODS
// =============================================================================
(function(output){

    var fs        = require("fs"),
        util      = require("util"),
        path      = require("path"),
        program   = require("commander"),

    verbose = true;

    function stdout() {

        if (verbose) {

            console.log.apply(this, arguments);

        }

    }

    function stderr() {

        if (verbose) {

            console.error.apply(this, arguments);

        }
    }

    function stdwarn() {

        if (verbose) {

            console.warn.apply(this, arguments);

        }

    }

    function inspect(something, showHidden, depth, colors) {
        colors = !(colors === false);
        depth = (depth === undefined || typeof depth != "number") ? null : depth;
        stdout(util.inspect(something, Boolean(showHidden), depth, colors));
    }

    function flatten(array) {
        return array.reduce(function(a, b) {
            if (util.isArray(b)) {
                return a.concat(flatten(b));
            }
            return a.concat(b);
        }, []);
    }

    function splitLines(input) {

        return input.replace("\r", "\n").split("\n");

    }

    function isDirectory(input) {

        if (fs.existsSync(input)) {

            return fs.statSync(input).isDirectory();

        }

        return false;

    }

    function isAssumedFile(input) {

        if (fs.existsSync(input)) {

            return !fs.statSync(input).isDirectory();

        }

        return (path.basename(input).indexOf(".") > -1);
    }

    function isRaw(input) {

        return ([
            ".jpeg", ".jpg",
            ".png",  ".gif",
            ".bin",  ".ico",
            ".bmp",  ".tiff"
            ].indexOf(path.extname(input).toLowerCase()) > -1);

    }

    function isImage(input) {
        return ([
            ".jpeg", ".jpg",
            ".png",  ".gif",
            ".bmp",  ".tiff"
            ].indexOf(path.extname(input).toLowerCase()) > -1);
    }

    function tab(count) {

        var result = "";

        while (count--) {

            result += "  ";

        }

        return result;

    }

    function mute() {

        verbose = false;

    }

    function confirm(str, callback, defaultsTo){

        program.prompt(str, function(decision){

            if (decision.length == 0) {

                callback(Boolean(defaultsTo));

            } else {

                callback(decision.toLowerCase().substr(0,1) == "y");

            }

        });

    };

    output.ENCODING = "utf8";

    output.tab           = tab;
    output.mute          = mute;
    output.stdout        = stdout;
    output.stderr        = stderr;
    output.stdwarn       = stdwarn;
    output.inspect       = inspect;
    output.flatten       = flatten;
    output.confirm       = confirm;
    output.splitLines    = splitLines;
    output.isRaw         = isRaw;
    output.isImage       = isImage;
    output.isDirectory   = isDirectory;
    output.isAssumedFile = isAssumedFile;


})(exports);
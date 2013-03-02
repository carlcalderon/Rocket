// =============================================================================
// COMPILERS
// =============================================================================
(function(output){

    var global = require("./global"),
        path   = require("path"),
        fs     = require("fs"),
        os     = require("os"),
        exec   = require("child_process").exec,
        list = [
            "uglify",       "yuicompressor", "closure",
            "coffeescript", "less",          "scss",
            "sass", "jpegoptim", "optipng"
        ],

    REGEXP_ARGUMENT     = function() { return /\{(\S*)\}/i; },

    JAVA_PREFIX = "java -jar -Xss2048k";

    output.uglify = {

        prefix: null,
        executable: "./node_modules/uglify-js/bin/uglifyjs",
        arguments: "{input}",
        returnsOutput: true,
        extensions: null,
        minifies: ["js"],
        minifier: null,
        builtIn: true

    };

    output.yuicompressor = {

        prefix: JAVA_PREFIX,
        executable: "./compilers/yuicompressor/yuicompressor-2.4.7.jar",
        arguments: "--type \"css\" {input}",
        returnsOutput: true,
        extensions: null,
        minifies: ["css"],
        minifier: null,
        builtIn: true

    };

    output.closure = {

        prefix: JAVA_PREFIX,
        executable: "./compilers/google_closure/compiler.jar",
        arguments: "{input}",
        returnsOutput: true,
        extensions: null,
        minifies: null,
        minifier: "uglify",
        builtIn: true

    };

    output.coffeescript = {

        prefix: null,
        executable: "./node_modules/coffee-script/bin/coffee",
        arguments: "-pc {input}",
        returnsOutput: true,
        extensions: ["coffee"],
        minifies: null,
        minifier: "uglify",
        builtIn: true

    };

    output.less = {

        prefix: null,
        executable: "./node_modules/less/bin/lessc",
        arguments: "{input}",
        returnsOutput: true,
        extensions: ["less"],
        minifies: null,
        minifier: "yuicompressor",
        builtIn: true

    };

    output.scss = {

        prefix: null,
        executable: "./compilers/sass/bin/scss",
        arguments: "-Cf --compass {input}",
        returnsOutput: true,
        extensions: ["scss"],
        minifies: null,
        minifier: "yuicompressor",
        builtIn: true

    };

    output.sass = {

        prefix: null,
        executable: "./compilers/sass/bin/sass",
        arguments: "-Cf --compass {input}",
        returnsOutput: true,
        extensions: ["sass"],
        minifies: null,
        minifier: "yuicompressor",
        builtIn: true

    };

    output.jpegoptim = {

        prefix: "cp {input} {output};",
        executable: "./compilers/jpegoptim/jpegoptim",
        arguments: "{output} -o --dest {outputPath}  --strip-all",
        returnsOutput: false,
        extensions: null,
        minifies: ["jpeg", "jpg"],
        minifier: null,
        builtIn: true

    };

    output.optipng = {

        prefix: "rm -f {output};",
        executable: "./compilers/optipng/optipng",
        arguments: "-strip all -clobber -q -force -o2 -out {output} {input}",
        returnsOutput: false,
        extensions: null,
        minifies: ["png", "gif", "bmp", "tiff"],
        minifier: null,
        builtIn: true

    };

    function match(files) {

        // Make one array of potentially many
        var flattened  = global.flatten(files),
            extensions = [],
            counts     = {},
            extension  = null,
            len        = flattened.length,
            i          = 0,
            high       = 0,
            most       = 0;

        // extract extensions
        for ( ; i < len; i++) {

            extension = path.extname(flattened[i]);

            if (extension != "." && extension != "") {

                if (counts.hasOwnProperty(extension)) {

                    counts[extension] += 1;

                } else {

                    counts[extension] = 1;

                }

            }

        }

        // count the highest
        for (extension in counts) {

            if (counts.hasOwnProperty(extension)) {

                if (counts[extension] > high) {

                    high = counts[extension];
                    most = extension.substr(1);

                }

            }

        }

        // find a matching compiler
        if (!!most) {

            for (i = 0, len = list.length; i < len; i++) {

                if (!!output[list[i]].extensions) {

                    if (output[list[i]].extensions.indexOf(most) > -1) {

                        return list[i];

                    }

                }

            };

        }

        return null;
    }

    function getList() {

        return list;

    }

    function run(compiler, filepath, input, callback) {

        var execStatement = null,
            options = {

                cwd: path.dirname(filepath),
                env: process.env

            },

        // Construct exec path
        execStatement = getExecStatement(compiler, filepath, input);

        exec(execStatement, options, function (error, result, issues) {

            if (!!error) {

                callback(1, result, issues);

            } else {

                if (compiler.returnsOutput) {

                    if (!!input.minify && !compiler.minifies) {

                        filepath = path.resolve(os.tmpDir(), "tmp_" + path.basename(input.output));

                        fs.writeFileSync(filepath, result);

                        minify(filepath, input, function() {

                            try {

                                fs.unlinkSync(filepath);

                            } catch (e) {
                                // ignore
                            }

                            callback.apply(this, arguments);

                        });

                    } else {

                        fs.writeFileSync(input.output, result);

                        callback(0);

                    }

                } else {

                    if (!!input.minify && !compiler.minifies) {

                        minify(input.output, input, callback);

                    } else {

                        callback(0);

                    }

                }


            }

        });

    }

    function compile(filepath, input, callback) {

        // Find matching compiler
        var compiler = output[input.compiler];

        // Break compilation if no compiler matching
        if (!compiler) {

            callback(1, "No compiler with id \"" + input.compiler + "\" found.");

            return;

        }

        run(compiler, filepath, input, callback);

    }

    function minify(filepath, input, callback) {

        var compiler = null,
            minifier = null,
            extension = path.extname(filepath);

        // Find matching compiler / minifier
        compiler = output[input.compiler];

        if (!!compiler) {

            minifier = output[compiler.minifier];

        }

        // None specified, let rocket find a suitable match
        if (!minifier) {

            minifier = getMinifierFor(extension.substr(1));

        }

        // No minifier found at all
        if (!minifier) {

            callback(1, "No minifier found for \"" + extension + "\".");

            return;

        }

        run(minifier, filepath, input, callback);

    }

    function getExecStatement(compiler, filepath, input) {

        var result     = [],
            args       = compiler.arguments,
            prefix     = compiler.prefix
            rocketPath = path.resolve(process.cwd(), process.argv[1]),
            execPath   = compiler.executable;

        function argumentReplace(string) {

            var block   = null,
                content = null;

            while ((block = REGEXP_ARGUMENT().exec(string)) != null) {

                switch (block[1].toLowerCase()) {

                    case "input" :

                        content = "\"" + filepath + "\"";

                        break;

                    case "output" :

                        content = "\"" + input.output + "\"";

                        break;

                    case "outputpath" :

                        content = "\"" + path.dirname(input.output) + "\"";

                        break;

                    case "inputpath" :

                        content = "\"" + path.dirname(input.input) + "\"";

                        break;

                    default :

                        content = input[block[1]] || "";

                        break;

                }

                string = string.replace(block[0], content);

            }

            return string;
        }

        // Get the proper process directory
        if (fs.lstatSync(rocketPath).isSymbolicLink()) {
            rocketPath = fs.readlinkSync(rocketPath);
        }
        rocketPath = path.dirname(rocketPath);

        if (!!compiler.prefix) {

            prefix = argumentReplace(prefix);

            result.push(prefix);

        }

        if (!!compiler.builtIn) {
            execPath = path.resolve(rocketPath, compiler.executable);
        } else {
            execPath = path.resolve(process.cwd(), compiler.executable);
        }

        result.push(execPath);

        if (!!compiler.arguments) {

            args = argumentReplace(args);

            result.push(args);

        }

        return result.join(" ");
    }

    function getMinifierFor(extension) {

        for (var i = 0, len = list.length; i < len; i++) {

            if (!!output[list[i]].minifies) {

                if (output[list[i]].minifies.indexOf(extension) > -1) {

                    return output[list[i]];

                }

            }

        }

        return null;

    }

    output.getList        = getList;
    output.match          = match;
    output.compile        = compile;
    output.minify         = minify;
    output.getMinifierFor = getMinifierFor;

})(exports);
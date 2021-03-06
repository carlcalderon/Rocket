// =============================================================================
// DEPENDENCIES
// =============================================================================
var parse     = require("./lib/parser").parse,
    schematic = require("./lib/schematic"),
    tokenize  = require("./lib/token").tokenize,
    global    = require("./lib/global"),
    errors    = require("./lib/errors"),
    watch     = require("./lib/watch"),
    build     = require("./lib/build").build,
    colorize  = require("./lib/style").colorize,
    exec      = require("child_process").exec,
    program   = require("commander"),
    path      = require("path"),

    DOGTAG  = "Rocket",
    MAJOR   = 0,
    MINOR   = 2,
    PATCH   = 3,
    BUILD   = '+0.0.3',
    VERSION = [MAJOR, MINOR, PATCH].join(".") + BUILD,

    stdout             = global.stdout,
    stderr             = global.stderr,
    publish            = schematic.publish,
    publishIssues      = schematic.publishIssues;
    publishBuildOrders = schematic.publishBuildOrders,

    projectFile = null,
    result      = null;

// =============================================================================
// PROGRAM
// =============================================================================
program.usage("[options] <configuration file>");
program.option("-a, --approve",    "automatically approve schematic",  false);
program.option("-b, --build <id>", "selects a specific build order"         );
program.option("-i, --ignore",     "ignore errors",                    false);
program.option("-I, --invisible",  "omit all output including errors", false);
program.option("-j, --json",       "output schematic as json",         false);
program.option("-l, --list",       "output build orders",              false);
program.option("-q, --quiet",      "quiet mode gives less output",     false);
program.option("-s, --schematic",  "output schematic",                 false);
program.option("-t, --tokens",     "output schematic as tokens",       false);
program.option("-u, --update",     "updates to the latest version",    false);
program.option("-v, --version",    "output version number",            false);
program.option("-w, --watch",      "enable watch mode",                false);
program.parse(process.argv);

// =============================================================================
// START
// =============================================================================

// Output version
if (program.version) {

    stdout(VERSION);
    process.exit(0);

// Update Rocket
} else if (program.update) {

    exec("cd /usr/local/lib/rocket/; sudo git pull -f", {env: process.env}, function(error, result, issues) {

        if (!!error) {

            stderr(colorize("ERROR:", "black", "red") + " Unable to update Rocket.\n" + issues);

            process.exit(1);

        } else {

            stdout("Update successful.");

            process.exit(0);

        }

    });

} else {

    if (!!program.invisible) {

        global.mute();

    }

    // Find project file
    projectFile = program.args[0];

    if (!projectFile) {

        projectFile = path.resolve(process.cwd(), "rocket-config.json");

    }

    // Parse config
    result = parse(projectFile, program);

    // Output JSON
    if (program.json) {

        global.inspect(result, false, null, false);
        process.exit(0);

    }

    // Output tokens
    if (program.tokens) {

        tokenize(result, program);
        process.exit(0);

    }

    // Shout out
    stdout(DOGTAG + " " + VERSION);

    // Check for fatal errors. If any is found; kill process even if ignore-flag is set.
    if (result.errors.length > 0) {

        for (var i = 0, len = result .errors.length; i < len; i++) {

            switch (result.errors[i].id) {

                case errors.INVALID_CONFIGURATION:
                case errors.FILE_NOT_FOUND:
                case errors.READ_ERROR:

                    stdout(program.helpInformation());

                    publishIssues(result, program);

                    process.exit(1);

                    break;

            }

        }

    }

    // Output list of build orders
    if (program.list) {

        publishBuildOrders(result, program);
        process.exit(0);

    }

    // User approves schematic prior to display
    if (program.approve || program.invisible) {

        // User wants to view the schematic even though the approve flag
        if (program.schematic) {

            publish(result, program);

        } else {

            // Publish any issues found
            publishIssues(result, program);

        }

        // Build
        build(result, program, function (buildResult) {

            if (program.watch && (buildResult == 0 || program.ignore)) {

                stdout("\n" + "Enter watch mode. Cancel using CTRL+C.");

                watch.start(result, projectFile, program);

            } else {

                process.exit(buildResult);

            }

        });

    // User wants to view schematic
    } else {

        publish(result, program);

        // Unless the schematic flag is set, continue if user approve
        if (!program.schematic) {

            // Ask for user permission to continue
            global.confirm("Do you want to continue? (Y/n): ", function (approve) {

                if (approve == true) {

                    // Separator
                    stdout("");

                    // Build
                    build(result, program, function (buildResult) {

                        if (program.watch && (buildResult == 0 || program.ignore)) {

                            stdout("\n" + "Enter watch mode. Cancel using CTRL+C.");

                            watch.start(result, projectFile, program);

                        } else {

                            process.exit(buildResult);

                        }

                    });

                } else {

                    // User did not approve of the schematic
                    process.exit(0);

                }

            }, true);
        }

    }

}
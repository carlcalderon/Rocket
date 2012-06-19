###!
   ___           __       __
  / _ \___  ____/ /_____ / /_
 / , _/ _ \/ __/  '_/ -_) __/
/_/|_|\___/\__/_/\_\\__/\__/

Copyright 2012 Carl Calderon

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
###

# ##################################################
# DEPENDENCIES
# ##################################################
program  = require "./library/node_modules/commander"
colors   = require "./library/node_modules/colors"
wrench   = require "./library/node_modules/wrench"
cp       = require "child_process"
crypto   = require "crypto"
paths    = require "path"
fs       = require "fs"
rocket   = require "./library/node_modules/rocket"
ƒ        = rocket.methods
notation = rocket.notation

# ##################################################
# CONSTANTS
# ##################################################
DOGTAG              = "Rocket"
MAJOR_VERSION       = 0
MINOR_VERSION       = 1
BUILD               = 12
VERSION             = [MAJOR_VERSION, MINOR_VERSION, BUILD].join "."
SEPARATOR           = "/"
FILE_SEPARATOR      = "\r\n"
FILE_ENCODING       = "utf8"
DEFAULT_CONFIG_NAME = "rocket-config.json"
UPDATE_EXEC         = "cd /usr/local/lib/rocket/; sudo git pull -f"
NOTATION =
    REPLACE: "replace"
    REMOVE:  "remove"
    CONCAT:  "concat"
    MINIFY:  "minify"
    INSERT:  "insert"

OPTIONS =
[
    ["-a, --approve",   "automatically approve schematic",          false]
    ["-s, --schematic", "view schematic",                           false]
    ["-w, --watch",     "sets #{DOGTAG} in watch mode",             false]
    ["-u, --update",    "updates #{DOGTAG} to the latest version.", false]
]

EXEC_OPTIONS =
    env: process.env

# ##################################################
# COMPILERS
# ##################################################
# List of currenlty supported compilers where
# the arguments holds {n} custom arguments.
# The {input} placeholder always specifies the
# input file.
COMPILERS =
    uglify:
        executable:    "./library/node_modules/uglify-js/bin/uglifyjs"
        arguments:     "{input}"
        returnsOutput: yes
        minifies:      "js"
        builtIn:       yes
    yuicompressor:
        prefix:        "java -jar -Xss2048k"
        executable:    "./library/compilers/yuicompressor/yuicompressor-2.4.7.jar"
        arguments:     "--type \"css\" {input}"
        returnsOutput: yes
        minifies:      "css"
        builtIn:       yes
    closure:
        prefix:        "java -jar -Xss2048k"
        executable:    "./library/compilers/google_closure/compiler.jar"
        arguments:     "{input}"
        returnsOutput: yes
        minifier:      "uglify"
        builtIn:       yes
    coffeescript:
        executable:    "./library/node_modules/coffee-script/bin/coffee"
        arguments:     "-pc {input}"
        returnsOutput: yes
        extension:     "coffee"
        minifier:      "uglify"
        builtIn:       yes
    less:
        executable:    "./library/node_modules/less/bin/lessc"
        arguments:     "{input}"
        returnsOutput: yes
        extension:     "less"
        minifier:      "yuicompressor"
        builtIn:       yes
    scss:
        executable:    "./library/node_modules/sass/bin/scss"
        arguments:     "{input}"
        returnsOutput: yes
        extension:     "scss"
        minifier:      "yuicompressor"
        builtIn:       yes
    sass:
        executable:    "./library/node_modules/sass/bin/sass"
        arguments:     "{input}"
        returnsOutput: yes
        extension:     "sass"
        minifier:      "yuicompressor"
        builtIn:       yes

# ##################################################
# REGULAR EXPRESSIONS
# ##################################################
# Fixes multiple execution bug in ECMAScript
# by always return an unused pattern.
REGEXP_NOTATION = -> /<\!--\s?(rocket|sb):\s?([\S]+)\s?(\S*?)\s?-->([\s\S]*?)<\!--\s?end\s?-->/gm
REGEXP_ARGUMENT = -> /\{([\w-]*?)\}/g
REGEXP_SCRIPT   = -> /script.+src="(.+)"/g
REGEXP_LINK     = -> /link.+href="(.+)"/g
REGEXP_TRIM     = -> /(\S+)/g

# ##################################################
# VARIABLES
# ##################################################
cwd             = do process.cwd
data            = null
files           = []
folders         = []
configFile      = null
rocketPath      = null
inWatchMode     = no
customCompilers = []
outputDirectory = "deploy"
inputDirectory  = "source"

# ##################################################
# HELPERS AND SHORTHANDS
# ##################################################
cpdir        = wrench.copyDirSyncRecursive
stdout       = ƒ.stdout
stderr       = ƒ.stderr
exist        = (path, created = no) ->

    result = ƒ.exist path
    if result is no and created is yes
        for file in files
            if file.output is path and ƒ.isDirectory(path) is no
                result = yes

    return result

# ##################################################
# PARSING
# ##################################################
parseConfig = (path) ->

    # Get the proper process directory
    rocketPath = ƒ.resolve cwd, process.argv[1]
    if fs.lstatSync(rocketPath).isSymbolicLink() is yes
        rocketPath = fs.readlinkSync rocketPath
    rocketPath = ƒ.dirname rocketPath

    # Resolve config path making it absolute
    filepath = ƒ.resolve ".", path

    # If the target is a directory, locate the config file.
    if exist(filepath) is yes
        if ƒ.isDirectory(filepath) is yes
            filepath = ƒ.resolve filepath, DEFAULT_CONFIG_NAME

    # Check for config existance
    if exist(filepath, yes) is yes
        configFile = filepath
    else
        stderr 1, "Configuration file does not exist (#{filepath})."

    # Reset the current working directory to the
    # path where the config file is located.
    # All execution originate from that path.
    cwd = ƒ.dirname filepath

    # Convert it to JSON
    try
        data = JSON.parse fs.readFileSync filepath
    catch error
        stderr 2, "Configuration error. Invalid JSON?"

    # Check for specified basedir
    cwd = (ƒ.resolve cwd, data.base_dir) if data.base_dir?

    # Reset lists
    files   = []
    folders = []

    # Resolve target and source dirs
    outputDirectory = ƒ.resolve cwd, data.output_dir
    inputDirectory  = ƒ.resolve cwd, data.input_dir
    customCompilers = data.compilers

    # Make sure the input directory is valid
    stderr 1, "Input directory does not exist." unless exist inputDirectory, yes

    # Validate compilers
    validateCompilers customCompilers

    # Start parsing
    parseBuild data.build

    return

validateCompilers = (list) ->

    # Only required field for a compiler is "executable"
    for id, options of list
        stderr 3, "Compiler \"#{id}\" is missing \"executable\" field." unless options.executable?

    return

parseBuild = (list) ->

    # Go through all files in configuration
    parseBuildObject object for object in list

    return

parseBuildObject = (object, append = yes) ->

    # No need for compile or minify
    if typeof object is "string"

        # Resolve file path
        sourcePath = ƒ.resolve inputDirectory, object
        targetPath = ƒ.resolve outputDirectory, object

        # Make sure path is valid
        unless exist sourcePath, true
            stderr 4, "Parse error\n#{sourcePath} does not exist."

        # Add directory to folders list
        if ƒ.isDirectory sourcePath
            if append is yes then folders.push
                output: targetPath
                input: [sourcePath]

        # Process file for notation
        else
            parseNotation ƒ.read sourcePath
            if append is yes then files.push
                output: targetPath
                input: [sourcePath]
                minify: false

    # File/folder require action
    else
        object.output = ƒ.resolve outputDirectory, object.output
        input = []
        if typeof object.input is "string" then object.input = [object.input]
        for source in object.input
            sourcePath = ƒ.resolve inputDirectory, source
            stderr 1, "#{source} does not exist." if not exist sourcePath, true
            parseNotation ƒ.read sourcePath unless ƒ.isDirectory sourcePath
            input.push sourcePath
        object.input = input
        if append is yes
            if ƒ.isDirectory input[0]
                folders.push object
            else
                files.push object

    return

parseNotation = (string) ->

    result = notation.parse string, inputDirectory

    if result.output?
        result.output = ƒ.resolve outputDirectory, result.output
        appendFile
            minify: result.minify
            output: result.output
            input:  result.files
    return result.data

appendFile = (buildObject) ->

    for file in files
        if file.output is buildObject.output
            for source in buildObject.input
                file.input.push source unless (file.input.indexOf ƒ.resolve inputDirectory, source) > -1
                parseBuildObject file, false
            return
    parseBuildObject buildObject

    return

# ##################################################
# SCHEMATIC
# ##################################################
publishSchematic = ->
    stdout "\nSchematic:\n".bold
    stdout "\toutput directory: #{outputDirectory}"
    stdout "\tinput directory: #{inputDirectory}"

    stdout "\n\tFiles:\n".bold unless files.length is 0
    for file in files
        stdout "\t\t" + (ƒ.relative cwd, file.output).green
        for inputFile in file.input
            stdout "\t\t\t" + ƒ.relative cwd, inputFile

    stdout "\n\tFolders:\n".bold unless folders.length is 0
    for folder in folders
        stdout "\t\t" + (ƒ.relative cwd, folder.output).green
        for inputFolder in folder.input
            stdout "\t\t\t" + ƒ.relative cwd, inputFolder
    stdout ""

    return

# ##################################################
# BUILD PROCESSES
# ##################################################
verifyApproval = (message, success) ->

    program.confirm "\n#{message} [y/n]: ", (result) ->
        process.exit 0 if result isnt yes
        if success? then do success

    return

build = ->

    stdout "\nBuild:\n".bold

    # Gather folders
    folderList = folders.slice 0
    for file in files
        folderList.push
            output: file.output.split(SEPARATOR)[0...-1].join SEPARATOR

    # Create the folder structure
    for folder in folderList
        relativePath = ƒ.relative process.cwd(), folder.output
        tree         = relativePath.split SEPARATOR
        result       = []
        for f, i in tree
            result[i] = tree.slice(0, i+1).join SEPARATOR
        for f in result
            unless f is ".." or f is ""
                ƒ.mkdir f unless exist f

    # Copy files in targeted folders
    stdout "\tFolders:\n".bold unless folders.length is 0
    for folder in folders
        target = ƒ.resolve cwd, folder.output
        for sourceFolder in folder.input
            source = ƒ.resolve cwd, sourceFolder
            cpdir source, target, {preserve: true}
        stdout "\t\t" + "+".green.inverse + " " + ƒ.relative cwd, target

    # Build complete, enter watch mode?
    proceed = ->
        if program.watch is yes
            do watchMode
            stdout "\n" + ("[" + do ƒ.now + "]").grey + " Complete"
        else
            stdout "Complete"
            process.exit 0

    # Perform actions on files
    stdout "\tFiles:\n".bold unless files.length is 0
    i = 0
    next = ->
        file = files[i]
        stdout "\t\t" + "+".green.inverse + " " + ƒ.relative cwd, file.output
        compile file, (result) ->
            unless result is null
                ƒ.write file.output, result
            if ++i is files.length then do proceed else do next
    do next


    return

compile = (buildObject, callback) ->

    if buildObject.compiler?
        compiler = customCompilers[buildObject.compiler]
    else
        compilerList = ƒ.mergeObjects COMPILERS, customCompilers
        for key, value of compilerList
            compiler = compilerList[key] if value.extension is ƒ.extension buildObject.input[0]
            if compiler? then break

    minify = (inputPath, buildObject, compressor, callback) ->

        if not compressor?
            # Find compressor if not specified
            compressorList = ƒ.mergeObjects COMPILERS, customCompilers
            for id, compiler of compressorList
                compressor = compiler if ƒ.extension(buildObject.output) is compiler.minifies
                if compressor? then break

        # Setup exec
        args      = compressor.arguments
        args      = args.replace "{input}", inputPath
        args      = args.replace "{output}", buildObject.output
        while field = (do REGEXP_ARGUMENT).exec args
            value = buildObject[field[1]]
            args  = args.replace field[0], value or ""
        execPath  = compressor.executable
        if compressor.builtIn is yes then execPath = ƒ.resolve(rocketPath, compressor.executable)
        if compressor.prefix? then execPath = compressor.prefix + " " + execPath
        execution = execPath + " " + args

        # Perform compression
        ƒ.exec execution, EXEC_OPTIONS, (error, result, err) ->
            if result?
                if compressor.returnsOutput is yes
                    callback result
                else
                    callback null
            else if err?
                return stderr 5, err

        return

    complete = (result = null) ->

        # Remove temp file
        ƒ.unlink tempFile

        # Call specified listener
        callback result

        return

    # Notation
    contents = ""
    for file in buildObject.input
        contents += parseNotation(ƒ.read file) + FILE_SEPARATOR

    # Write concat / result temporary
    tempFile = "/tmp/" + ƒ.filename buildObject.input[0]
    ƒ.write tempFile, contents

    if compiler?
        # Compile
        compiler.returnsOutput = compiler.arguments.indexOf("{output}") > -1 unless compiler.returnsOutput?

        # Setup exec
        args      = compiler.arguments
        args      = args.replace "{input}", "\"" + tempFile + "\""
        args      = args.replace "{output}", "\"" + buildObject.output + "\""
        while field = (do REGEXP_ARGUMENT).exec args
            value = buildObject[field[1]]
            args  = args.replace field[0], value or ""
        execPath  = compiler.executable
        if compiler.builtIn is yes then execPath = ƒ.resolve(rocketPath, compiler.executable)
        if compiler.prefix? then execPath = compiler.prefix + " " + execPath
        execution = execPath + " " + args

        # Perform compilation
        ƒ.exec execution, EXEC_OPTIONS, (error, result, err) ->
            if error? and err isnt ""
                if inWatchMode is yes
                    stdout "ERR! ".red + err
                else
                    stderr 6, err
            if result? and result isnt ""
                if compiler.returnsOutput is yes
                    if buildObject.minify is yes
                        ƒ.write tempFile, result
                        compressor = if compiler.minifier? then COMPILERS[compiler.minifier] else null
                        minify tempFile, buildObject, compressor, (compressed) ->
                            complete compressed
                    else complete result
                else complete null
            else
                return complete null
    else
        # No compilation
        if buildObject.minify is yes
            minify tempFile, buildObject, null, (compressed) ->
                complete compressed
        else complete contents

    # Watch input files for change.
    if program.watch is yes
        watchers = []
        for sourcePath in buildObject.input
            watchers.push fs.watch sourcePath, (event, filename) ->
                do watcher.close for watcher in watchers
                compile buildObject, (result) ->
                    unless result is null
                        ƒ.write buildObject.output, result
                    stdout ("[" + do ƒ.now + "]").grey + " Compiled " + ƒ.relative(cwd, buildObject.output).bold

    return

# ##################################################
# WATCH MODE
# ##################################################
watchMode = ->

    unless inWatchMode is yes
        stdout "Entering watch mode... (Abort using CTRL+C)"

        # Watch build configuration file
        fs.watch configFile, ->
            stdout ("[" + do ƒ.now + "]").grey + " Config changed"
            parseConfig configFile
            do build

    inWatchMode = yes

    # Listen for folder changes
    for buildObject in folders
        for sourcePath in buildObject.input
            watchFolder = (sourcePath, object) ->
                fs.watch sourcePath, (event, folder) ->
                    stdout ("[" + do ƒ.now + "]").grey + " Folder updated: " + ƒ.relative(cwd, object.output).bold
                    cpdir sourcePath, object.output, {preserve: true}
            watchFolder sourcePath, buildObject


    return

# ##################################################
# START
# ##################################################

# Initiate program
program.usage "[options] <configuration file>"
program.version VERSION
program.option.apply program, option for option in OPTIONS
program.parse process.argv;

stdout "#{DOGTAG} #{VERSION}"

# Check for update flag
if program.update is yes
    ƒ.exec UPDATE_EXEC, (error, result, err) ->
        if error? then stderr 6, err else
            stdout "Update successful."
else

    # Parse the specified config
    if program.args? and program.args[0]?
        parseConfig program.args[0]
    else
        parseConfig ƒ.resolve cwd, DEFAULT_CONFIG_NAME

    # Schematic
    if program.schematic is yes
        do publishSchematic
        process.exit 0

    # Approval
    if program.approve isnt yes
        do publishSchematic if program.schematic isnt yes
        verifyApproval "Are you sure?", build

    # Build
    else do build
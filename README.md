
![Rocket](http://carlcalderon.github.com/Rocket/icon/128.png)

# Rocket

A simple yet sophisticated tool for building, compiling & minifying projects.

## What is Rocket?
Rocket is a [node.js][nodejs] based universal compiler, builder & minifier offering functionality similar to [CodeKit][codekit] and [Springboard][springboard]. The sugar that separates Rocket from *the rest* lies at the core of its flexibility. Read on for guaranteed gasps…

## Installation and Update

Firstly, you will need [node.js][nodejs] version 0.8.2 or higher. Once installed, run the following command:

    sudo git clone -b "deploy" https://github.com/carlcalderon/Rocket.git /usr/local/lib/rocket; sudo ln -s /usr/local/lib/rocket/rocket /usr/local/bin/rocket

This will install Rocket to your user directory and make it available everywhere.

To update Rocket, open up the terminal and run:

    rocket --update

[nodejs]: http://nodejs.org/
[codekit]: http://incident57.com/codekit/
[springboard]: https://github.com/soulwire/Springboard

## Usage

To use Rocket, simply open up the terminal and run:

    rocket [ options... ] <path_to_config>

### Options

| Shorthand | Long form     | Description                       |
| :-------- | :------------ | :-------------------------------- |
| -h        | --help        | output usage information          |
| -a        | --approve     | automatically approve schematic   |
| -b \<id\> | --build \<id\>| selects a specific build order    |
| -i        | --ignore      | ignore errors                     |
| -I        | --invisible   | omit all output including errors  |
| -l        | --list        | output build orders               |
| -q        | --quiet       | quiet mode gives less output      |
| -s        | --schematic   | output schematic                  |
| -u        | --update      | updates to the latest version     |
| -v        | --version     | output version number             |
| -w        | --watch       | enable watch mode                 |

## Configuration files

Rocket's only requirement is a single JSON configuration file. It really is that simple!

### Basic Example

```json
{
    "input_dir": "source",
    "output_dir": "deploy",
    "buildOrders": [
        {
            "id": "build-my-site",
            "items": [

                // My index file
                "index.html",

                // Copy my images
                "images",

                // Compile my CoffeeScript
                {
                    "input": "coffee/scripts.coffee",
                    "output": "js/scripts.js",
                    "minify": true
                },

                // Compile my LESS files
                {
                    "input": [
                        "less/mixins.less",
                        "less/styles.less"
                    ],
                    "output": "css/styles.css"
                }
            ]
        }
    ]
}
```
...will output...
 
* deploy/index.html
* deploy/images/
* deploy/js/scripts.js
* deploy/css/styles.css

...where `scripts.js` is compiled and minified into `scripts.js` and `mixins.less` is compiled together with `styles.less` into `styles.css`.

**Tip:** If no configuration file is specified, Rocket automatically tries to load `rocket-config.json` in the current working directory.

### Options

The root JSON object may specify the following fields:

| Field             | Description                         | Optional | Default                     |
| :---------------- | :---------------------------------- | :------: | :-------------------------- |
| buildOrders       | Build orders. What to be done.      | false    |                             |
| inputDir          | Source directory.                   | false    |                             |
| outputDir         | Target directory.                   | true     | "./deploy"                  |
| baseDir           | Directory to run Rocket from.       | true     | "."                         |
| compilers         | List of custom compilers.           | true     |                             |
| defaultBuildOrder | Defines the default Build Order     | true     | First item in `buildOrders` |


### Build Orders
The `buildOrders` field specified in a configuration file should contain a list
of Build Orders. A Build Order consists of a single Object which contain an
`id`field and an `items` field. The `id` is used to reference the build order
and the `items` field may contain Build Objects (See Build Objects). Build Orders are similar to `<target>` nodes in ANT.

**Tip:** You may list available Build Orders in a Rocket configuration file by adding the `-l` or `--list` flag.

**Tip:** You may select a specific Build Order to execute by setting the `-b` or `--build` flag (i.e. `$ rocket --build "push-to-git" rocket-config.json`).

##### Example
```json
{
    "input_dir": "source",
    "output_dir": "deploy",
    "buildOrders": [
        
        // A Build Order copying JavaScript
        {
            "id": "scripts",
            "items": [
				"js/my-script.js",
				"js/lib/jquery.js"
            ]
        },
        
        // Another Build Order that concatenates 3 folders
        // of pictures into a single "my-pets" folder and
        // copy the favicon.ico from the source to the deploy.
        {
        	"id": "images",
        	"items": [
        		{
        			"input": [
        				"my-dog",
        				"my-cat",
        				"my-parrot",
        			],
        			"output": "my-pets"
        		},
        		"favicon.ico"
        	]
        }
        
    ]
}
```

### Build Objects

Build Objects may be as simple as a path to a file or folder. There are several different types of Build Objects each performing a different task.

#### Files & Folders 

Files & folders may hold the following fields:

| Field       | Description                         | Optional | Type                                    |
| :---------- | :---------------------------------- | :------: | :-------------------------------------- |
| input       | Source path.                        | false    | Array or String (relative to inputDir)  |
| output      | Target path.                        | false    | String (relative to outputDir)          |
| minify      | Minify the output.                  | true     | Boolean                                 |
| compiler    | Custom compiler ID.                 | true     | String                                  |
| \<custom\>  | Any data used for custom compilers. | true     | Any (99% of the time: String)           |

##### Example - Directories

The following Build Object specifies 3 folders containing pictures of pets as input directories and concatenate them to a single `my-pets` folder.

```json
{
	"input": [
		"my-dog",
		"my-cat",
		"my-parrot",
	],
	"output": "my-pets"
}
```

##### Example - Files

The following Build Object concatenates, compiles and minifies two coffee scripts into a single `scripts.js` file.

```json
{
	"input": [
		"coffee/bootstrap.coffee",
		"coffee/menu.coffee"
	],
	"minify": true,
	"output": "js/scripts.min.js"
}
```

##### Example - Single String

Each line below are valid Build Objects and are parsed and compiled if needed too.

```json
[...]
"scripts/bootstrap.coffee", // will result in scripts/bootstrap.js
"images", // will be copied recursively
"index.html" // will be parsed for notation blocks (See Notation) and copied
[...]
```

**Tip:** If a string; Rocket will automatically derive whether it is a *file* or a *folder* and perform the appropriate tasks pending on the type. Folders will be copied recursively and files will be parsed for notation blocks before being copied directly to a mirrored path in the `outputDir`.

#### Command Line Execution

Build Objects may also execute command line tasks such as `git` or `curl`. The output from these executions may be stored into files as well making Rocket extremely powerful.


| Field  | Description             | Optional |
| :----- | :---------------------- | :------: |
| exec   | Command line execution. | false    |
| output | Target path for stdout. | true     |

##### Examples

```json
// Get a fresh copy of jQuery
{
	"exec": "curl http://code.jquery.com/jquery-1.8.2.min.js",
	"output": "js/jquery.min.js"
},

// Pull the latest from your GIT repo
{
	"exec": "git pull"
}
```

#### Link to other Build Orders

Another handy trick Rocket provides is linkage to other Build Orders. Much like the depends attribute in ANT but with the advantage of being able to decide when it's executed.


| Field      | Description                          | Optional |
| :--------- | :----------------------------------- | :------: |
| buildOrder | String or Array of Build Order id's. | false    |

##### Examples

```json
// Single
"buildOrder": "get-latest-from-git",

// Multiple
"buildOrder": ["get-latest-from-git", "build-all", "deploy-to-server"]
```

#### Hooks

Sometimes you find yourself the situation where you would like to perform an addition task before or after a file is compiled. This can be achieved using the `hooks` field. Hooks include `before` and `after` statements which reference other Build Orders.

| Field  | Description                          | Optional |
| :----- | :----------------------------------- | :------: |
| before | String or Array of Build Order id's. | true     |
| after  | String or Array of Build Order id's. | true     |

##### Example

```json
{
    "exec": "git commit -m \"New build\"",
    "hooks": {
        "before": "build",
        "after": ["cleanup", "email_the_boss"]
    }
}
```

#### Packaged Compilers

Rocket comes with a collection of commonly used compilers for your convenience. Furthermore, these compilers are automatically selected and employed by the following schema:

| ID            | Task              | invoke by                                       |
| :------------ | :---------------- | :---------------------------------------------- |
| uglify        | Minify            | `{minify: true}` on .js output                  |
| yuicompressor | Minify            | `{minify: true}` on .css output                 |
| closure       | Minify            | `{compiler: "closure"}`                         |
| coffeescript  | Compile .coffee   | *.coffee as input                               |
| less          | Compile .less     | *.less as input                                 |
| scss          | Compile .scss     | *.scss as input                                 |
| sass          | Compile .sass     | *.sass as input                                 |
| jpegoptim     | Image compression | `{minify: true}` on jpg input                   |
| optipng       | Image compression | `{minify: true}` on png, gif, bmp or tiff input |

#### Custom Compilers

An **awesome** feature of Rocket is custom compiler configuration.

If you have some CoffeeScript that needs to be compiled with the bare flag (-b), you can specify a custom compiler like so:

```json
{
    "inputDir": "source",
    "outputDir": "deploy",
    "compilers": {
        "coffeescript-bare": {
            "executable": "coffee",
            "arguments": "-cb -o {output} {input}"
        }
    },
    "buildOrders": [
        {
            "id": "compile",
            "items": [
                {
                    "input": "coffee/scripts.coffee",
                    "output": "js/scripts.js",
                    "compiler": "coffeescript-bare"
                }
            ]
        }
    ]
}
```

The above example declares a custom compiler with an ID of `coffeescript-bare` and specifies the executable and bespoke arguments. The custom `coffeescript-bare` compiler is then referenced in a build object to be used to compile **scripts.coffee** into **scripts.js**.

The custom compiler can contain any number of custom fields which are shared between the arguments string and the build object it self (**NOTE:** `{input}` and `{output}` are reserved). This allows for shared compiler setups but file-to-file specific arguments. 

The following example shows how a single custom compiler can produce different results by using a custom `message` field:

```json
{
    "inputDir": "source",
    "outputDir": "deploy",
    "compilers": {
        "coffeescript-custom": {
            "executable": "coffee",
            "returnsOutput": true,
            "arguments": "-pe {message}"
        }
    },
    "buildOrders": [
        {
            "id": "compile",
            "items": [
                {
                    "compiler": "coffeescript-custom", // Link to custom compiler
                    "message": "### Hello! ###",  // Custom message
                    "output": "js/hello.js"
                },
                {
                    "compiler": "coffeescript-custom", // Link to custom compiler
                    "message": "### World! ###", // Custom message
                    "output": "js/world.js"
                }
            ]
        }
    ]
}
```

#### Custom Compiler Fields

| Field         | Description                                                 | Optional |
| :------------ | :---------------------------------------------------------- | :------: |
| executable    | Path to executable.                                         | false    |
| arguments     | Command line arguments.                                     | false    |
| prefix        | Command line arguments placed prior to executable path.     | true     |
| returnsOutput | True if compiler output results.                            | true     |
| extensions    | File-extension used to match input files.                   | true     |
| minifies      | File-extension used to match input files when minifying.    | true     |
| minifier      | ID of compiler which is used to minify the compiled output. | true     |

## Notation

Rocket (as well as Springboard) provides basic html comment notations to specify inline build actions within files. Rocket recognises both Rocket & Springboard (limited) notation blocks.

### Syntax

```html
<!-- <rocket|sb>: <action> <target|notes> -->
<content>
<!-- end -->
```

### Examples

```html
<!-- rocket: replace js/scripts.js -->
<script type="text/coffeescript" src="coffee/scripts.coffee"></script>
<!-- end -->

<!-- rocket: minify css/styles.css -->
<link rel="stylesheet" type="text/css" href="less/styles.less">
<!-- end -->

<!-- rocket: remove Debug mode -->
<script type="text/javascript">

    var DEBUG_MODE = true;

</script>
<!-- end -->

<!-- rocket: insert -->
header.html
body.html
footer.html
<!-- end -->
```

### Inline Notation Actions

| Action  | Description                                      |
| :------ | :----------------------------------------------- |
| remove  | Removes the content within the block.            |
| replace | Replaces/compiles either scripts or links (css). |
| concat  | Combines the listed files.                       |
| minify  | As *replace* but also minifies.                  |
| insert  | Reads each separated row as a file to include.   |

## Rocket Inception

Unless running in watch mode, all builds are made in order of input. This provides a unique way of nesting build objects. 

The following example shows how the **output** of one build item can be used as the **input** of the next.

```json
{
    "input_dir": "source",
    "output_dir": "deploy",
    "build": [
        {
            "input": "coffee/library.coffee",
            "output": "js/library.js"
        },
        {
            "input": "../deploy/js/library.js",
            "output": "js/library.min.js",
            "minify": true
        }
    ]
}
```

Pretty awesome right? Now imagine the following scenario:

1. Rocket performs a build which constructs a new configuration file.
2. In the same build, a new Rocket instance is run as a custom compiler with the `-a` flag targeting the generated configuration file.
3. The new Rocket instance could then perform step 1 and so on and so on...

## Endless Possibilities

Combine custom compilers with the order of compilation and it is easy to see that Rocket can perform the most amazing things. With minimal effort, you can setup a complete build order including LESS, CoffeeScript, compression and even deployment.

### Future

Rocket will always be in favour of developers and evolve along side the community. So please get involved, post a suggestion, or send a pull request!

## Change Log

### 0.2.2
OCT 11, 2012

* Updated SASS / SCSS compiler to 3.2.1
* Fixed issue where directories where parsed even if not marked for compression
* Added hooks

### 0.2.1
SEP 28, 2012

* Image compression (optipng and jpegoptim)
* Output JSON through `-j` or `--json`
* Output tokens through `-t` or `--tokens`

### 0.2.0
SEP 24, 2012

* Multiple Build Orders
* Build Order linkage (multiple execution)
* Quiet `-q` mode
* Less aggressive error reports
* Even more clever watch-mode
* Completely rewritten source
* Modular configuration
* Better output type pattern
* Elaborated schematic output

## Author

Carl Calderon: [@carlcalderon](http://twitter.com/carlcalderon)

## Contributors

Matthew Wagerfield: [@mwagerfield](http://twitter.com/mwagerfield)

## License

Licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0)

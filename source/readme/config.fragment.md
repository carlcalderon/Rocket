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


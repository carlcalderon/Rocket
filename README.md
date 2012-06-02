# Rocket

The way it should be.

## What is Rocket?

Rocket is a [node.js][nodejs] based universial compiler/builder/minifier for frontend developers (not exclusivly). Rocket is similar to [CodeKit][codekit] and [Springboard][springboard] but includes only the good stuff from both (and some others).

## Install

First of all, you need [node.js][nodejs]. Once you have node.js, run the following command, which makes Rocket available from anywhere!

 	sudo git clone -b "deploy" git://github.com/carlcalderon/Rocket.git /usr/local/lib/rocket; sudo ln -s /usr/local/lib/rocket/rocket /usr/local/bin/rocket

By running the above makes updating Rocket easy too. Open up the terminal and run:

	cd /usr/local/lib/rocket/; sudo git pull -f

If you encounter exec permission issues, try the following command:

	sudo chmod +x /usr/local/lib/rocket/rocket

## Usage

To run (launch) Rocket, just open up the terminal and type:

	rocket [ options... ] <path_to_config>

### Options

Rocket comes with a bunch of options. First off is the `--schematic` or `-s` flag. By specifying this flag you tell rocket to present the build order or _schematic_ generated by the provided configuration. This is useful when you are unsure about the configuration setup and want to validate the output prior to compilation.

Rocket automatically tells you what's going to happen and asks for your permission to compile unless the approve flag has been set even if you don't specify the _schematic_ flag. This provides extra security and minimize errors.

Then we have the `--approve` or `-a` flag. This option automatically approves the schematic. This is handy when you don't change your config and are certain of the finished result.

Last but not least is the **watch mode**! This handy feature uses [node.js][nodejs] watch methods listening for changes to folders, files or even the configuration it self! Entering watch mode is easy, just add the `--watch` or `-w` argument. Rocket will present the schematic, ask for your approval (unless _-a_) and right after first build automatically enter the watch mode.

| Option       | Shorthand | Description                                                |
| :----------- | :-------- | :--------------------------------------------------------- |
| \--approve   | -a        | Automatically approves the schematic.                      |
| \--schematic | -s        | Outputs a schematic / build order of the specified config. |
| \--watch     | -w        | Sets Rocket in watch mode after first successful build.    |

## Configuration

One neat thing about Rocket is that it only require a single configuration file in JSON for a complete project build setup. It is super simple!

### Let us look at a basic setup

The following example shows you a very basic configuration file. We have an input directory, output directory, a coffee-script, a couple of less files and an index.html. The config in this case would be placed in the same folder as the source directory.

```json
{
	"output_dir": "deploy",
	"input_dir": "source",
	"build": [
		{
			"output": "js/scripts.js",
			"minify": true,
			"input": "coffee/scripts.coffee"
		},
		{
			"output": "css/styles.css",
			"input": [
				"less/mixins.less",
				"less/styles.less"
			]
		},
		"index.html"
	]
}
```

You may notice that the objects in _build_ doesn't share the same setup. First we have the coffee-script which specifies a single .coffee file to be compiled and minified into scripts.js. Second we have a styles.css which originates from two separate less files combined into one and compiled to styles.css. Lastly we have the index.html which will be parsed for notation blocks and copied directly.

This example would produce this:

	deploy/index.html
	deploy/js/scripts.js
	deploy/css/styles.css

### What are my options?

The Rocket configuration files are really simple. The root JSON object may hold the following fields:

| Field       | Description                         | Optional | Default           |
| :---------- | :---------------------------------- | :------: | :---------------- |
| base_dir    | Directory where to run rocket from. | true     | "." (config path) |
| input_dir   | Source directory.                   | false    |                   |
| output_dir  | Target directory.                   | true     | "./deploy"        |
| compilers   | List of custom compilers.           | true     |                   |
| build       | Build orders. What to be done.      | false    |                   |


#### Adding files and folders

Files and folders may hold the following fields:

| Field       | Description                         | Optional | Type                                   |
| :---------- | :---------------------------------- | :------: | :------------------------------------- |
| output      | Destination path.                   | false    | String (rel. to output_dir)            |
| input       | Source directory.                   | false    | Array or String (rel. to input_dir)    |
| minify      | Minify output.                      | true     | Boolean                                |
| compiler    | Custom compiler id reference.       | true     | String                                 |
| \<custom\>  | Any data used for custom compilers  | true     | Any (99% of the time: String)          |

The `build` field specified in a config may contain either Objects or Strings. If a string; Rocket will automatically read if it's a file or a folder and perform the appropriate tasks pending on the type. Folders will be copied recursively and files will be parsed for notation blocks and copied directly to mirrored path in the `output_dir`.

The following snippet shows how a folder (_images_) and a file (_index.html_) are specified.

```json
	[...]
	"build": [
		"images",
		"index.html"
	]
```

A file or folder may also be added as an Object specifying even more actions.

```json
	[...]
	"build": [
		{
			"output": "images",
			"input": [
				"folderwithimages",
				"anotherfolder"
			]
		},
		{
			"output": "index.html",
			"input": [
				"markup/header-fragment.html",
				"markup/body-fragment.html",
				"markup/footer-fragment.html"
			]
		}
	]
```

Scripts such as CoffeeScript and LESS provides even more options (they require input and output).

```json
	[...]
	"build": [
		{
			"output": "js/scripts.js",
			"minify": true,
			"input": [
				"coffee/first.coffee",
				"coffee/second.coffee"
			]
		},
		{
			"output": "css/styles.css",
			"minify": true,
			"input": "less/styles.less"
		}
	]
```

#### Built in compilers

There are a couple of compilers built in which are selected by the following schema:

| ID            | Task             | invoke by                       |
| :------------ | :--------------- | :------------------------------ |
| uglify        | Minify           | `{minify: true}` on .js output  |
| yuicompressor | Minify           | `{minify: true}` on .css output |
| closure       | Minify           | `{compiler: "closure"}`         |
| coffeescript  | Compile .coffee  | *.coffee as input               |
| less          | Compile .less    | *.less as input                 |

#### Custom compilers

A very cool feature of Rocket are the custom compilers. Let's say that you have a CoffeeScript that needs to be compiled with the bare flag (`-b`) enabled your config would probably look something like this:

```json
{
	"output_dir": "deploy",
	"input_dir": "source",
	"compilers": {
		"coffeescript-bare": {
			"executable": "coffee",
			"arguments": "-cb -o {output} {input}"
		}
	},
	"build": [
		{
			"output": "js",
			"compiler": "coffeescript-bare",
			"input": "coffee/scripts.coffee"
		}
	]
}
```

The above example specifies a specific compiler `coffeescript-bare` as the compiler for the _coffee/scripts.coffee_ file. The custom compiler may hold any number of custom fields which are shared between the arguments string and the build object it self (`{input}` and `{output}` are reserved). 

This allows for shared compiler setups but file-to-file specific arguments. The following example shows how a single custom compiler can produce different results by using the custom field `message`:

```json
{
	"output_dir": "deploy",
	"input_dir": "source",
	"compilers": {
		"coffee-custom": {
			"executable": "coffee",
			"returnsOutput": true,
			"arguments": "-pe {message}"
		}
	},
	"build": [
		{
			"output": "js/scripts1.js",
			"compiler": "coffee-custom",
			"message": "### Hello! ###"
		},
		{
			"output": "js/scripts2.js",
			"compiler": "coffee-custom",
			"message": "### World! ###"
		}
	]
}
```

Custom compiler fields are:

| Field         | Description                                              | Optional |
| :------------ | :------------------------------------------------------- | :------: |
| executable    | Path to executable.                                      | false    |
| arguments     | Command line arguments.                                  | false    |
| returnsOutput | True if compiler output results.                         | true     |
| extension     | File-extension used to match input files.                | true     |
| minifies      | File-extension used to match input files when minifying. | true     |

## Notation

Rocket (as well as Springboard) provides basic html comment-notations to inline specify build actions. Rocket recognize both Rocket and Springboard (limited) notation blocks. Note that a configuration file is still needed to target the markup (i.e. html) where the notation is located.

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
```

### Available actions

| Action  | Description                                      |
| :------ | :----------------------------------------------- |
| remove  | Removes the content within the block.            |
| replace | Replaces/Compiles either scripts or links (css). |
| concat  | Combines the listed files.                       |
| minify  | As _replace_ but also minifies.                  |

## Rocket Inception

Unless running in watch mode, all builds are made in order of input. This provides a unique way of nesting build objects. The following example shows how the output of one build item can be used in the next.

```json
{
	"output_dir": "deploy",
	"input_dir": "source",
	"build": [
		{
			"output": "js/awesome.js",
			"input": "coffee/awesome-library.coffee"
		},
		{
			"output": "js/awesome.min.js",
			"minify": true,
			"input": "../deploy/js/awesome.js"
		}
	]
}
```

Imagine the following possible scenario:

1. Rocket performs a build which constructs a new configuration file
2. In the same build, a new rocket instance is run as a custom compiler with the `-a` flag targeting the generated configuration file
3. The new rocket instance may then again do step 1 and so on and so on...

## The possibilities are endless

With the custom compilers, the defined order of compiles and the easy setup, Rocket can perform the most amazing things. With almost no effort, you can setup a complete build order including LESS, CoffeeScript, Compression and even deployments.

### Future

Rocket will always be in favor of developers and evolve along side the community. There are many more features in the pipline but even so; any input, tip, pull request or suggestion is more than welcome!

## Author

Carl Calderon: [@carlcalderon][twitter]

## License

Licensed under the [Apache License, Version 2.0][apache]

[nodejs]: http://nodejs.org/
[codekit]: http://incident57.com/codekit/
[springboard]: https://github.com/soulwire/Springboard
[twitter]: http://twitter.com/carlcalderon
[apache]: http://www.apache.org/licenses/LICENSE-2.0
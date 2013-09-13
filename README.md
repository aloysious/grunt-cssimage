# grunt-cssimage

> A plugin that grab images url in CSS files, minify those images, and replace image urls to the minified ones stored in your local disk. It supports both local and remote images grabbing and it can minify .png, .jpg, .jpeg, .gif image files.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-cssimage --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-cssimage');
```

## The "cssimage" task

### Overview
In your project's Gruntfile, add a section named `cssimage` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  cssimage: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

### Options

#### options.optimizationLevel
Type: `Number`
Default value: `7`

A number value that represents optimization level 1-7. 7 is the maximum optimization level.

#### options.imagePath
Type: `String`
Default value: `'./image'`

A string value that refers to the path which would store the minified images in your local computer.

#### options.cleanBeforeTask
Type: `Boolean`
Default value: `true`

A boolean value that is used to tell grunt to whether empty you imagePath or not before executing the task.

#### options.saveOriginal
Type: `Boolean`
Default value: `false`

A boolean value that is used to decide to whether save the original(un-minified) images in imagePath or not.

### Usage Examples

#### Default Options
In this example, the default options are used. So it will first empty the `./image` path. If the `src/test.css` file has some image urls inside, the task will grab the images locally or remotely, minify them, and then replace those urls with minified ones stored in your local computer. The output replaced file will be `dest/test.css`. At last, `./image/original` directory will be emptied.

```js
grunt.initConfig({
  cssimage: {
    options: {},
    files: {
      'dest/test.css': ['src/test.css'],
    },
  },
})
```

#### Custom Options
In this example, images grabbing, minification and replacement are the same to the default options example. But the image path will change to `./tmp`. Also, grunt will not empty the image path before task execution and save both original and minified images in the end. 

```js
grunt.initConfig({
  cssimage: {
    options: {
      imagePath: './tmp',
	  cleanBeforeTask: false,
	  saveOriginal: true
    },
    files: {
      'dest/test.css': ['src/test.css'],
    },
  },
})
```

## Release History
 * 2013-09-13   v0.1.0   First release.

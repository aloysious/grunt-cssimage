/*
 * grunt-wtbuild
 * https://github.com/aloysious/grunt-wtbuild
 *
 * Copyright (c) 2013 aloysious
 * Licensed under the MIT license.
 */

'use strict';


module.exports = function(grunt) {
	var path = require('path');
	var fs = require('fs');
	var http = require('http');
	var os = require('os');
	var crypto = require('crypto');
	var childProcess = require('child_process');
	var filesize = require('filesize');
	var chalk = require('chalk');
	var optipngPath = require('optipng-bin').path;
	var pngquantPath = require('pngquant-bin').path;
	var jpegtranPath = require('jpegtran-bin').path;
	var gifsiclePath = require('gifsicle').path;
	var numCPUs = os.cpus().length;
	var tmpdir = os.tmpdir ? os.tmpdir() : os.tmpDir();
	var cacheDir = path.join(tmpdir, 'grunt-contrib-imagemin.cache');

	function hashFile(filePath) {
		var content = grunt.file.read(filePath);
		return crypto.createHash('sha1').update(content).digest('hex');
	}

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

	grunt.registerMultiTask('cssimage', 'Minify images in css/less and upload them to TPS', function() {
		// Merge task-specific and/or target-specific options with these defaults.
		var done = this.async();
        var options = this.options({
            optimizationLevel: 7,
            progressive: true,
            pngquant: true,
			imagePath: './image',
			cleanBeforeTask: true,
			saveOriginal: false
        });
        var optipngArgs = ['-strip', 'all'];
        var pngquantArgs = ['-'];
        var jpegtranArgs = ['-copy', 'none', '-optimize'];
        var gifsicleArgs = ['-w'];
        var totalSaved = 0;

		if (typeof options.optimizationLevel === 'number') {
            optipngArgs.push('-o', options.optimizationLevel);
        }

        if (options.progressive === true) {
            jpegtranArgs.push('-progressive');
        }
        
		grunt.verbose.writeflags(options, 'Options');

		if (options.cleanBeforeTask) {
			grunt.file.delete(path.resolve(options.imagePath));
		}

		// Iterate over all specified file groups.
       	grunt.util.async.forEachSeries(this.files, function (f, Pnext) {

			f.src.forEach(function(src){
				var inputSrc = path.resolve(src),
					outputSrc = path.resolve(String(f.dest)),
					outputFile = path.resolve(outputSrc),
					content = grunt.file.read(inputSrc).toString(),
					imageArr = [],
					rawImageArr = [];

				rawImageArr = grunt.util._.uniq(content.match(/[^'"\(]*\.(png|jpeg|jpg|gif)/ig));
       			grunt.util.async.forEachLimit(rawImageArr, numCPUs, function (rawImage, next) {
					var rawPath = rawImage.replace(/['"\(\)]/ig, ''),  // 文件中的图片地址
						minPath;                                       // 压缩后的本地绝对路径

					// 如果不是远程文件，取图片在本地的绝对路径
					if (!/^(http:\/\/)/i.test(rawPath)) {
						var savedPath = path.resolve(options.imagePath, 'origin', new Date().getTime() + path.extname(rawPath));
						var srcPath = path.resolve(path.dirname(inputSrc), rawPath);
						grunt.file.copy(srcPath, savedPath);
						minPath = path.resolve(options.imagePath, 'min', path.basename(savedPath));
						imageArr.push({
							rawPath: rawPath,
							minPath: minPath
						});
                        grunt.log.writeln(chalk.yellow('[saved local image] ') + srcPath + chalk.green(' → ') + savedPath);
						optimize(savedPath, minPath, next);
					
					// 否则，从远程抓取图片，保存于本地
					} else {
						http.get(rawPath, function(res) {
							var savedPath = path.resolve(options.imagePath, 'origin', new Date().getTime() + path.extname(rawPath));
							grunt.file.mkdir(path.dirname(savedPath));
							res.pipe(fs.createWriteStream(path.resolve(savedPath)));
							res.on('end', function() {
								minPath = path.resolve(options.imagePath, 'min', path.basename(savedPath));
								imageArr.push({
									rawPath: rawPath,
									minPath: minPath
								});
                        		grunt.log.writeln(chalk.yellow('[save remote image] ') + rawPath + chalk.green(' → ') + savedPath);
								optimize(savedPath, minPath, next);
							});
						}).on('error', function(e) {
							grunt.log.writeln(e.message);
						});
					}
				}.bind(this), function(err) {
					if (err) {
						grunt.warn(err);
					}

					// 替换css中的图片地址，指向到本地的压缩后文件
					replaceImages(inputSrc, outputFile, imageArr);
					Pnext();
				}.bind(this));
			});
		}.bind(this), function(err) {
            if (err) {
                grunt.warn(err);
            }
            
			grunt.log.writeln('Minified ' + this.files.length + ' ' +
                (this.files.length === 1 ? 'file' : 'files') +
                chalk.gray(' (saved '  + filesize(totalSaved) + ')'));

			// 是否清空临时保存的压缩前的图片文件
			if (!options.saveOriginal) {
				grunt.file.delete(path.resolve(options.imagePath, 'origin'));
			}
			
			done();
		}.bind(this));

		function replaceImages(src, dest, imageArr) {
			var content = grunt.file.read(src).toString(),
				outputContent = '';

			grunt.util._.each(imageArr, function(image) {
				var outputPath = path.relative(path.dirname(dest), image.minPath),
					re = new RegExp(image.rawPath, 'ig');
				content = content.replace(re, outputPath);
			});

			grunt.file.write(dest, content);
			grunt.log.writeln(dest + chalk.green(' saved!'));
		}
        
		function optimize(src, dest, next) {
            var cp;
            var originalSize = fs.statSync(src).size;
            var cachePath = path.join(cacheDir, hashFile(src));

            function processed(err, result, code) {
                var saved, savedMsg;

                if (err) {
                    grunt.log.writeln(err);
                }

                saved = originalSize - fs.statSync(dest).size;
				totalSaved += saved;

                if (result && (result.stderr.indexOf('already optimized') !== -1 || saved < 10)) {
                    savedMsg = 'already optimized';
                } else {
                    savedMsg = 'saved ' + filesize(saved);
                }

                if (!grunt.file.exists(cachePath)) {
                    grunt.file.copy(dest, cachePath);

                    if (grunt.option('verbose')) {
                        grunt.log.writeln(chalk.yellow('[caching] ') + src + ' → ' + cachePath);
                    }
                }

                grunt.log.writeln(chalk.yellow('[minify] ') + chalk.green('✔ ') + src + chalk.gray(' (' + savedMsg + ')'));
                next();
            }

            grunt.file.mkdir(path.dirname(dest));

            if (grunt.file.exists(cachePath)) {
                if (grunt.option('verbose')) {
                    grunt.log.writeln('[cached] ' + src + ' ← ' + cachePath);
                }

                grunt.file.copy(cachePath, dest);
                processed();
            } else if (path.extname(src).toLowerCase() === '.png') {
                if (options.pngquant) {
                    var tmpDest = dest + '.tmp';

                    cp = grunt.util.spawn({
                        cmd: pngquantPath,
                        args: pngquantArgs
                    }, function () {
                        if (grunt.file.exists(dest)) {
                            grunt.file.delete(dest);
                        }

                        grunt.util.spawn({
                            cmd: optipngPath,
                            args: optipngArgs.concat(['-out', dest, tmpDest])
                        }, function () {
                           	grunt.file.delete(tmpDest);
                            processed();
                        });
                    });

                    cp.stdout.pipe(fs.createWriteStream(tmpDest));
                    fs.createReadStream(src).pipe(cp.stdin);
                } else {
                    if (dest !== src && grunt.file.exists(dest)) {
                        grunt.file.delete(dest);
                    }

                    cp = grunt.util.spawn({
                        cmd: optipngPath,
                        args: optipngArgs.concat(['-out', dest, src])
                    }, processed);
                }
            } else if (['.jpg', '.jpeg'].indexOf(path.extname(src).toLowerCase()) !== -1) {
                cp = grunt.util.spawn({
                    cmd: jpegtranPath,
                    args: jpegtranArgs.concat(['-outfile', dest, src])
                }, processed);
            } else if (path.extname(src).toLowerCase() === '.gif') {
                cp = grunt.util.spawn({
                    cmd: gifsiclePath,
                    args: gifsicleArgs.concat(['-o', dest, src])
                }, processed);
            } else {
                next();
            }

            if (cp && grunt.option('verbose')) {
                cp.stdout.pipe(process.stdout);
                cp.stderr.pipe(process.stderr);
            }
        }
	});
};

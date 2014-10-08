gulp = require 'gulp'
gutil = require 'gulp-util'

paths =
  scripts: './src/*.coffee'
  stylesheets: './src/*.styl'
  views: './src/*.jade'

coffee = require 'gulp-coffee'
gulp.task 'coffee', ->
  gulp
    .src paths.scripts
    .pipe coffee()
    .on 'error', gutil.log
    .pipe gulp.dest './build'

stylus = require 'gulp-stylus'
nib = require 'nib'
gulp.task 'stylus', ->
  gulp
    .src paths.stylesheets
    .pipe stylus use: [ nib() ], errors: true
    .pipe gulp.dest './build'

jade = require 'gulp-jade'
gulp.task 'jade', ->
  gulp
    .src paths.views
    .pipe jade()
    .pipe gulp.dest './build'

tasks = [ 'coffee', 'stylus', 'jade' ]

gulp.task 'watch', tasks, ->
  gulp.watch paths.scripts, ['coffee']
  gulp.watch paths.stylesheets, ['stylus']
  gulp.watch paths.views, ['jade']

gulp.task 'default', tasks

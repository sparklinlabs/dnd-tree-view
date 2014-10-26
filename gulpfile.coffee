gulp = require 'gulp'

paths =
  stylesheets: './src/demo/*.styl'
  views: './src/demo/*.jade'

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'

gulp.task 'build', ->
  browserify('./TreeView.coffee', extensions: ['.coffee'], standalone: 'TreeView')
    .bundle()
    .pipe source 'TreeView.js'
    .pipe gulp.dest './lib'

# Demo stylesheet
stylus = require 'gulp-stylus'
nib = require 'nib'

gulp.task 'stylus', ->
  gulp
    .src paths.stylesheets
    .pipe stylus use: [ nib() ], errors: true
    .pipe gulp.dest './doc/demo'

# Demo view
jade = require 'gulp-jade'

gulp.task 'jade', ->
  gulp
    .src paths.views
    .pipe jade()
    .pipe gulp.dest './doc/demo'

# Watch
tasks = [ 'build', 'stylus', 'jade' ]

gulp.task 'watch', tasks, ->
  gulp.watch [ 'src/**/*.coffee' ], ['build']
  gulp.watch paths.stylesheets, ['stylus']
  gulp.watch paths.views, ['jade']

gulp.task 'default', tasks

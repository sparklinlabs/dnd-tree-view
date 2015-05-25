var gulp = require("gulp");
var tasks = [ "jade", "stylus", "browserify" ];

// Jade
var jade = require("gulp-jade");
gulp.task("jade", function() {
  return gulp.src("./src/demo/*.jade").pipe(jade()).pipe(gulp.dest("./doc/demo"));
});

// Stylus
var stylus = require("gulp-stylus");
var nib = require("nib");
gulp.task("stylus", function() {
  return gulp.src("./src/demo/*.styl").pipe(stylus({use: [ nib() ], errors: true})).pipe(gulp.dest("./doc/demo"));
});

// TypeScript
var ts = require("gulp-typescript");
gulp.task("typescript", function() {
  var tsResult = gulp.src([ "src/**/*.ts", "!node_modules/**" ]).pipe(ts({
    typescript: require("typescript"),
    declarationFiles: false,
    module: "commonjs",
    target: "ES5",
    noImplicitAny: true
  }));
  return tsResult.js.pipe(gulp.dest("./src"));
});

// Browserify
var browserify = require("browserify");
var vinylSourceStream = require("vinyl-source-stream");

gulp.task("browserify", [ "typescript" ], function() {
  var bundler = browserify("./src/index.js", { standalone: "TreeView" });
  function bundle() { return bundler.bundle().pipe(vinylSourceStream("TreeView.js")).pipe(gulp.dest("./lib")); };
  return bundle();
});

// All
gulp.task("default", tasks);

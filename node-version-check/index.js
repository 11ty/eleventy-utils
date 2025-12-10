// Updated https://www.npmjs.com/package/please-upgrade-node (MIT)
// Reuses semver package (already in use on Eleventy core)
var semver = require("semver");

module.exports = function nodeVersionCheck(pkg, opts) {
  var opts = opts || {}
  var requiredVersion = pkg.engines.node;
  var currentVersion = process.version.replace('v', '')
  if (semver.satisfies(currentVersion, requiredVersion)) {
		return;
	}

  if (opts.message) {
    console.error(opts.message(requiredVersion))
  } else {
    console.error(
      pkg.name +
        ' requires Node ' +
        requiredVersion +
        ', please upgrade!'
    )
  }

  if (opts.hasOwnProperty('exitCode')) {
    process.exit(opts.exitCode)
  } else {
    process.exit(1)
  }
}

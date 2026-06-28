function readPackage(pkg) {
  pinDependency(pkg, "browserslist", "4.25.3");
  pinDependency(pkg, "caniuse-lite", "1.0.30001781");
  pinDependency(pkg, "electron-to-chromium", "1.5.208");
  pinDependency(pkg, "node-releases", "2.0.19");
  pinDependency(pkg, "update-browserslist-db", "1.1.3");

  if (pkg.name === "sucrase") {
    pkg.dependencies = {
      ...pkg.dependencies,
      glob: "^10.5.0",
    };
  }

  if (pkg.name === "glob") {
    pkg.dependencies = {
      ...pkg.dependencies,
      minimatch: "^9.0.7",
    };
  }

  if (pkg.name === "anymatch") {
    pkg.dependencies = {
      ...pkg.dependencies,
      picomatch: "^2.3.2",
    };
  }

  if (pkg.name === "readdirp") {
    pkg.dependencies = {
      ...pkg.dependencies,
      picomatch: "^2.3.2",
    };
  }

  if (pkg.name === "micromatch") {
    pkg.dependencies = {
      ...pkg.dependencies,
      picomatch: "^2.3.2",
    };
  }

  return pkg;
}

function pinDependency(pkg, dependencyName, version) {
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    if (pkg[field]?.[dependencyName]) {
      pkg[field] = {
        ...pkg[field],
        [dependencyName]: version,
      };
    }
  }
}

module.exports = {
  hooks: {
    readPackage,
  },
};

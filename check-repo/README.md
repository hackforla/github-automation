# check-repo
check that repos have common files

# example
```javascript
// TODO
```

# install
```bash
git clone https://github.com/hackforla/github-automation
cd check-repo
npm i
cherp --help
```

# API
`check-repo exposes a small command line interface.

## `cherp license`
check that the repo has a recognizable LICENSE file, and open a PR with one if
not. Default: GPL-2.0

```bash
cherp check-license --org hackforla --repo github-automation
```

pass a `--license` option with a [SPDY identifier](https://spdx.org/licenses/) to add a different license.
```bash
cherp check-license --org hackforla --repo github-automation --license apache-2.0
```

# LICENSE
GPL-2.0
hackforla © 2020

# Preview attempt 1 — host observer refusal

Source `5f68efd1e5c928e3764f48d3077366c145c0fd14`, tree
`6c5b834732433bc648618b24eecf61764dfecb09` (17 files), native tree identical.
[Run43534069991](https://github.com/alvarovillalbaa/contextlet/actions/runs/43534069991),
job132258677939, workflow417886494: overall FAILURE. Original
artifact14088028367 is53,294 bytes, SHA-256
`fe95bb418abb3a2c4d7bac01bfbefea4d43704a46b43be338450905cdfd0308d`.
The unchanged original ZIP is retained in the portfolio handoff bundle.
The committed package stdout is losslessly gzip-encoded to preserve its original
trailing spaces; decode before comparing the receipt's original stream digest.

All four outer command leaders reaped; all groups were absent, source vectors
matched and nonce/inode-checked cleanup passed for591,813,751 scratch bytes.
Node22.23.4, pinned vsce3.6.2/test-electron2.5.2. Packaging passed; VS Code1.95.3
download and actual CLI installation completed. No H01–H04 scenario ran.

The observer refused installed package.json byte inequality. Its actual
installed bytes were not retained before cleanup, so no particular installer
field difference is proved by this failure. Independently inspecting the saved
VSIX confirms source-exact package.json and the packager's explicit renamed
readme.md/LICENSE.txt/changelog.md entries. The observer incorrectly expected
the original source documentation filenames in the installed directory too.

Repair only the observer: retain installed raw manifest and both installation
streams, compare every parsed product manifest field with source while excluding
only VS Code's __metadata field, use the observed exact documentation member
names, and retain each installed/source digest. Pin the first resolved tool
dependency lock for npm ci. Product, core tests and four host case bodies stay
unchanged; do not rerun the18 passed core cases. Repackage this still-unreleased
preview and perform the four still-unrun packaged-host scenarios under the
separate exact second QA ref. Preserve this failed result and its limits.

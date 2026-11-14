# Preview attempt 2 — packaged documentation mismatch

Source `29cff6cd18ae1abe3f9482654cfd27abf2c35fee`, tree
`1613347685f598278d61b25b062e090b3a66a562` (32 files); native tree identical.
[Run43534529399](https://github.com/alvarovillalbaa/contextlet/actions/runs/43534529399),
job132260204035: FAILURE. Artifact14088493780 is55,946 bytes, SHA-256
`8b2f4feccea31590ea37f31749985f50173915e8e80db11137f4bb65e9aefbaa`.
Original ZIP remains in the portfolio handoff; committed package stdout is
lossless gzip. Source guards, all four leaders/groups and owned cleanup pass;
scratch524,282,400 bytes. Frozen tooling lock is unchanged. H01–H04 remain UNRUN.

Installed manifest is retained this time. All product fields match; the actual
extra __metadata contains isApplicationScoped=false, installedTimestamp,
pinned=true and source=vsix. Both runtime code payloads also match. The next
observer check refuses README.md. Data-only VSIX inspection identifies exactly
two changes: vsce rewrote README's relative contract/plan links to absolute
GitHub HEAD links. Package.json, both code files, license and changelog are
byte-exact. An initial independent six-payload assertion failed on that README
transform; its corrected per-file diff exposed the two links, not a runtime bug.

The third preparation makes those two documentation URLs explicit in source,
so packaged documentation can still be checked byte-for-byte. Only README and
the exact QA guard change outside retained evidence. Product/runtime, core
fixtures, native case bodies and observers stay unchanged. Do not rerun the
18 passed core identities. Run only the still-unqualified packaged host scope.
The prior overall failure stays false; no native behavior is yet accepted.

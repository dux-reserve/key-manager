<p align="center">
  <img src="public/img/logos/dux-logo-with-text.svg" width="350" title="Dux Reserve">
</p>

<h3 align="center">
  Key Manager — 0.4.2-beta
</h3>


----


# Changelog

## 0.4.2 Beta - 2021-05-17

### Release notes
Mostly small bug fixes, corrections & dependencies update.


### Unreleased
  - Extended Validation Certificate (EV)
  - Config dropdown selection with icon
  - Transaction switch bug on update
  - PSBT Quorum & Signature validation
  - Docs: Start [CONTRIBUTING.md](CONTRIBUTING.md)

### Added
  - RBF is now with a help icon with some explanation
  - Docs: Start [CHANGELOG.md](CHANGELOG.md)

### Changed
  - Value lower than 0.00 for gold and silver should be rounded with 4 decimals
  - Docs: Update [ACKNOWLEDGMENT.md](ACKNOWLEDGMENT.md)
  - Docs: Update [DEV-README.md](DEV-README.md)
  - Docs: Update [README.md](README.md)
  - Docs: Update [RELEASE-PROCESS.md](RELEASE-PROCESS.md)
  - Update [dependencies](https://github.com/dux-reserve/key-manager/compare/0.4.1-beta...0.4.2-beta#diff-7ae45ad102eab3b6d7e7896acd08c427a9b25b346470d7bc6507b6481575d519)
  - Update to Node 16.1.0

### Fixed
  - PSBT Micro SD exporting
  - Reset App ClearInterval
  - Small amount withdrawal bug
  - Password second try bug
  - Fee selector menu on edit transaction details
  - Feedback box message encryption
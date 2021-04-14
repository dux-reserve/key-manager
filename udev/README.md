<p align="center">
  <img src=../public/img/logos/dux-logo-with-text.svg width="350" title="Dux Reserve">
</p>
<h3 align="center">
  Key Manager — 0.4.1-beta
</h3>


----


## udev rules (Linux ONLY)

This directory contains all of the udev rules for the supported devices as retrieved from vendor websites and repositories.
Those rules are required for the hardwallet devices to be reachable on any **Linux environment**.

 - `20-hw1.rules` (Ledger): https://github.com/LedgerHQ/udev-rules/blob/master/20-hw1.rules
 - `51-coinkite.rules` (Coldcard): https://github.com/Coldcard/ckcc-protocol/blob/master/51-coinkite.rules
 - `51-hid-digitalbitbox.rules`, `52-hid-digitalbitbox.rules` (Digital Bitbox): https://shiftcrypto.ch/start_linux
 - `51-trezor.rules` (Trezor): https://github.com/trezor/trezor-common/blob/master/udev/51-trezor.rules
 - `51-usb-keepkey.rules` (Keepkey): https://github.com/keepkey/udev-rules/blob/master/51-usb-keepkey.rules


----

## Usage

1. Download `udev.tar.xz`
2. Extract
3. Run the shell script or do it manually

### Shell script

We made a shell script to make the UDEV rules setup easier. Simply run `add_udev_rules.sh`:

1. Grant execution permission to `add_udev_rules.sh`

```
chmod u+x add_udev_rules.sh
```

2. Run `add_udev_rules.sh` script

```
./add_udev_rules.sh
```

### Manual Setup

If you prefer to do it manually, apply these rules by copying them to `/etc/udev/rules.d/` and notifying `udevadm`.
Your user will need to be added to the `plugdev` group, which needs to be created if it does not already exist.

```
sudo cp *.rules /etc/udev/rules.d/
sudo udevadm trigger
sudo udevadm control --reload-rules
sudo groupadd plugdev
sudo usermod -aG plugdev `whoami`
```


----


Thanks to the [Specter](https://github.com/cryptoadvance/specter-desktop/tree/master/udev) team for the information
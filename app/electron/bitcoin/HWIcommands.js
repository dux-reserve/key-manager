const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const platform = os.platform();

const execute = async command => {
	return new Promise((resolve, reject) => {
		let hwiFile = 'hwi.exe';

		if (platform === 'darwin') hwiFile = 'HWI_MAC';
		if (platform === 'linux') hwiFile = 'HWI_LINUX';

		const binariesPath = path.join(__dirname, '/../../../HWI/');
		const pathToHwi = path.resolve(path.join(binariesPath, hwiFile));

		execFile(pathToHwi, command, (error, stdout) => {
			if (error) {
				reject(error);
			}
			resolve(stdout);
		});
	});
};

const displayAddressOnHardWallet = async (deviceType, devicePath, bip32derivationPath, testnet) => {
	if (testnet) return await execute(['-t', deviceType, '-d', devicePath, '--testnet', 'displayaddress', bip32derivationPath]);
	else return await execute(['-t', deviceType, '-d', devicePath, 'displayaddress', bip32derivationPath]);
};

const enumerateConnectedHardWallet = async () => await execute(['enumerate']);

const getXPubFromHardWallet = async (deviceType, devicePath, bip32derivationPath, testnet) => {
	if (testnet) return await execute(['-t', deviceType, '-d', devicePath, '--testnet', 'getxpub', bip32derivationPath]);
	else return await execute(['-t', deviceType, '-d', devicePath, 'getxpub', bip32derivationPath]);
};

const promptPinOnHardWallet = async (deviceType, devicePath) => await execute(['-t', deviceType, '-d', devicePath, 'promptpin']);

const sendPinToHardWallet = async (deviceType, devicePath, pin) => await execute(['-t', deviceType, '-d', devicePath, 'sendpin', pin]);

const signPsbtWithHardWallet = async (deviceType, devicePath, psbt, testnet) => {
	if (testnet) return await execute(['-t', deviceType, '-d', devicePath, '--testnet', 'signtx', psbt]);
	else return await execute(['-t', deviceType, '-d', devicePath, 'signtx', psbt]);
};

module.exports = {
	displayAddressOnHardWallet,
	enumerateConnectedHardWallet,
	getXPubFromHardWallet,
	promptPinOnHardWallet,
	sendPinToHardWallet,
	signPsbtWithHardWallet,
};

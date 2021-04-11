const { v4: uuidv4 } = require('uuid');
const { getBitcoinNetworkType } = require('./index');

const createSinglesigConfig = (device, currentBitcoinNetwork) => {
	const config = {
		version: 1,
		name: device.configName,
		wallets: [],
		vaults: [],
		keys: [],
	};

	const newKey = {
		id: uuidv4(),
		name: device.configName,
		created_at: Date.now(),
		lastHealthCheck: Date.now(),
		bip32Path: 'm/0',
		customDerivation: false,
		parentFingerprint: device.fingerprint,
		network: getBitcoinNetworkType(currentBitcoinNetwork),
		withPassphrase: false,
		xpub: device.xpub,
		device: {
			type: device.type,
			model: device.model,
			fingerprint: device.fingerprint,
		},
	};

	config.wallets.push({
		id: uuidv4(),
		name: device.configName,
		created_at: Date.now(),
		addressType: 'p2sh',
		extendedPublicKeys: [newKey],
		network: getBitcoinNetworkType(currentBitcoinNetwork),
		quorum: { requiredSigners: 1, totalSigners: 1 },
	});

	config.keys.push(newKey);

	return config;
};

const createMultisigConfig = (devices, requiredSigners, currentBitcoinNetwork) => {
	const config = {
		version: 1,
		name: devices[0].configName,
		wallets: [],
		vaults: [],
		keys: [],
	};

	const newKeys = devices.map(device => {
		return {
			id: uuidv4(),
			name: devices[0].configName,
			created_at: Date.now(),
			lastHealthCheck: Date.now(),
			bip32Path: 'm/0',
			customDerivation: false,
			parentFingerprint: device.fingerprint,
			network: getBitcoinNetworkType(currentBitcoinNetwork),
			withPassphrase: false,
			xpub: device.xpub,
			device: {
				type: device.type,
				model: device.model,
				fingerprint: device.fingerprint,
			},
		};
	});

	config.vaults.push({
		id: uuidv4(),
		name: devices[0].configName,
		created_at: Date.now(),
		addressType: 'P2WSH',
		extendedPublicKeys: newKeys,
		network: getBitcoinNetworkType(currentBitcoinNetwork),
		quorum: {
			requiredSigners: requiredSigners,
			totalSigners: devices.length,
		},
	});

	config.keys.push(...newKeys);

	return config;
};

module.exports = {
	createSinglesigConfig,
	createMultisigConfig,
};

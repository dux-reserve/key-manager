const BigNumber = require('bignumber.js');
const bs58check = require('bs58check');
const { networks, payments } = require('bitcoinjs-lib');
const { deriveChildPublicKey, generateMultisigFromPublicKeys } = require('unchained-bitcoin');
const { getTransactionsFromAddressFromBlockstream, getUtxosAddressesFromBlockstream } = require('./network');

const areBitcoinNetworkEqual = (a, b = networks.bitcoin) => a.bech32 === b.bech32;

const getBitcoinNetworkType = currentBitcoinNetwork => {
	if (areBitcoinNetworkEqual(currentBitcoinNetwork, networks.bitcoin)) {
		return 'mainnet';
	} else {
		return 'testnet';
	}
};

// TODO: handle multiple accounts
const getDerivationPath = (addressType, bip32derivationPath, currentBitcoinNetwork) => {
	if (addressType === 'multisig') {
		return getMultisigDerivationPathForNetwork(currentBitcoinNetwork) + '/' + bip32derivationPath.replace('m/', '');
	} else if (addressType === 'p2sh') {
		return getP2shDerivationPathForNetwork(currentBitcoinNetwork) + '/' + bip32derivationPath.replace('m/', '');
	} else {
		// p2wpkh
		return getP2wpkhDerivationPathForNetwork(currentBitcoinNetwork) + '/' + bip32derivationPath.replace('m/', '');
	}
};

const getMultisigDerivationPathForNetwork = currentBitcoinNetwork => {
	if (areBitcoinNetworkEqual(currentBitcoinNetwork, networks.bitcoin)) {
		// Mainnet
		return "m/48'/0'/0'/2'";
	} else {
		// Testnet
		return "m/48'/1'/0'/2'";
	}
};

const getP2shDerivationPathForNetwork = currentBitcoinNetwork => {
	if (areBitcoinNetworkEqual(currentBitcoinNetwork, networks.bitcoin)) {
		// Mainnet
		return "m/49'/0'/0'";
	} else {
		// Testnet
		return "m/49'/1'/0'";
	}
};

const getP2wpkhDerivationPathForNetwork = currentBitcoinNetwork => {
	if (areBitcoinNetworkEqual(currentBitcoinNetwork, networks.bitcoin)) {
		// Mainnet
		return "m/84'/0'/0'";
	} else {
		// Testnet
		return "m/84'/1'/0'";
	}
};

const getChildPubKeyFromXpub = (xpub, bip32DerivationPath, addressType, currentBitcoinNetwork) => {
	const path = getDerivationPath(addressType, bip32DerivationPath, currentBitcoinNetwork);

	return {
		childPubKey: deriveChildPublicKey(xpub.xpub, bip32DerivationPath, getBitcoinNetworkType(currentBitcoinNetwork)),
		bip32derivation: {
			masterFingerprint: Buffer.from(xpub.parentFingerprint, 'hex'),
			pubkey: Buffer.from(deriveChildPublicKey(xpub.xpub, bip32DerivationPath, getBitcoinNetworkType(currentBitcoinNetwork)), 'hex'),
			path: path,
		},
	};
};

const getAddressFromPubKey = (childPubKey, addressType, currentBitcoinNetwork) => {
	let address;

	if (addressType === 'p2sh') {
		address = payments.p2sh({
			redeem: payments.p2wpkh({ pubkey: Buffer.from(childPubKey.childPubKey, 'hex'), network: currentBitcoinNetwork }),
			network: currentBitcoinNetwork,
		});
	} else {
		// p2wpkh
		address = payments.p2wpkh({ pubkey: Buffer.from(childPubKey.childPubKey, 'hex'), network: currentBitcoinNetwork });
	}

	address.bip32derivation = [childPubKey.bip32derivation];
	return address;
};

const getMultisigAddressFromPubKeys = (pubkeys, config, currentBitcoinNetwork) => {
	const rawPubkeys = pubkeys.map(publicKey => publicKey.childPubKey);
	rawPubkeys.sort();

	const address = generateMultisigFromPublicKeys(getBitcoinNetworkType(currentBitcoinNetwork), config.addressType, config.quorum.requiredSigners, ...rawPubkeys);
	address.bip32derivation = pubkeys.map(publicKey => publicKey.bip32derivation);

	return address;
};

const getAddressFromAccount = (account, path, currentBitcoinNetwork) => {
	if (account.quorum.totalSigners > 1) {
		// Vault
		const childPubKeys = account.extendedPublicKeys.map(extendedPublicKey => {
			return getChildPubKeyFromXpub(extendedPublicKey, path, 'multisig', currentBitcoinNetwork);
		});

		return getMultisigAddressFromPubKeys(childPubKeys, account, currentBitcoinNetwork);
	} else {
		// Wallet
		if (account.addressType === 'p2sh') {
			const receivePubKey = getChildPubKeyFromXpub(account.extendedPublicKeys[0], path, 'p2sh', currentBitcoinNetwork);
			return getAddressFromPubKey(receivePubKey, 'p2sh', currentBitcoinNetwork);
		} else {
			const receivePubKey = getChildPubKeyFromXpub(account.extendedPublicKeys[0], path, 'p2wpkh', currentBitcoinNetwork);
			return getAddressFromPubKey(receivePubKey, 'p2wpkh', currentBitcoinNetwork);
		}
	}
};

const createAddressMapFromAddressArray = addressArray => {
	const addressMap = new Map();

	addressArray.forEach(addr => {
		addressMap.set(addr.address, addr);
	});

	return addressMap;
};

const scanForAddressesAndTransactions = async (account, currentBitcoinNetwork, limitGap) => {
	const changeAddresses = [];
	const receiveAddresses = [];
	let transactions = [];

	const unusedChangeAddresses = [];
	const unusedReceiveAddresses = [];

	let gap = 0;
	let i = 0;

	try {
		while (gap < limitGap) {
			const receiveAddress = getAddressFromAccount(account, `m/0/${i}`, currentBitcoinNetwork);

			receiveAddresses.push(receiveAddress);
			const receiveTxs = await getTransactionsFromAddressFromBlockstream(receiveAddress.address, currentBitcoinNetwork);
			if (!receiveTxs.length) {
				unusedReceiveAddresses.push(receiveAddress);
			} else {
				transactions = [...transactions, ...receiveTxs];
			}

			const changeAddress = getAddressFromAccount(account, `m/1/${i}`, currentBitcoinNetwork);
			changeAddresses.push(changeAddress);
			const changeTxs = await getTransactionsFromAddressFromBlockstream(changeAddress.address, currentBitcoinNetwork);
			if (!changeTxs.length) {
				unusedChangeAddresses.push(changeAddress);
			} else {
				transactions = [...transactions, ...changeTxs];
			}

			if (!receiveTxs.length && !changeTxs.length) {
				gap = gap + 1;
			} else {
				gap = 0;
			}

			i = i + 1;
		}
	} catch (error) {
		return Promise.reject(new Error(error));
	}
	return { changeAddresses, receiveAddresses, transactions, unusedChangeAddresses, unusedReceiveAddresses };
};

const arrangeTransactions = (transactionsFromBlockstream, addresses, changeAddresses) => {
	const changeAddressesMap = createAddressMapFromAddressArray(changeAddresses);
	const addressesMap = createAddressMapFromAddressArray(addresses);

	transactionsFromBlockstream.sort((a, b) => a.status.block_time - b.status.block_time);

	let currentAccountTotal = BigNumber(0);
	const transactions = new Map();
	for (let i = 0; i < transactionsFromBlockstream.length; i++) {
		let transactionPushed = false;
		let possibleTransactions = new Map();
		for (let j = 0; j < transactionsFromBlockstream[i].vout.length; j++) {
			if (addressesMap.get(transactionsFromBlockstream[i].vout[j].scriptpubkey_address)) {
				const transactionWithValues = transactionsFromBlockstream[i];
				transactionWithValues.value = transactionsFromBlockstream[i].vout[j].value;
				transactionWithValues.address = addressesMap.get(transactionsFromBlockstream[i].vout[j].scriptpubkey_address);
				transactionWithValues.type = 'received';
				transactionWithValues.totalValue = currentAccountTotal.plus(transactionsFromBlockstream[i].vout[j].value).toNumber();
				transactions.set(transactionsFromBlockstream[i].txid, transactionWithValues);
				transactionPushed = true;
				currentAccountTotal = currentAccountTotal.plus(transactionsFromBlockstream[i].vout[j].value);
			} else if (changeAddressesMap.get(transactionsFromBlockstream[i].vout[j].scriptpubkey_address)) {
			} else {
				if (!transactions.get(transactionsFromBlockstream[i].txid)) {
					const transactionWithValues = transactionsFromBlockstream[i];
					transactionWithValues.value = transactionsFromBlockstream[i].vout[j].value;
					transactionWithValues.address = transactionsFromBlockstream[i].vout[j].scriptpubkey_address;
					transactionWithValues.type = 'sent';
					transactionWithValues.totalValue = currentAccountTotal.minus(transactionsFromBlockstream[i].vout[j].value + transactionsFromBlockstream[i].fee).toNumber();
					possibleTransactions.set(transactionsFromBlockstream[i].txid, transactionWithValues);
				}
			}
		}

		if (!transactionPushed) {
			const possibleTransactionsIterator = possibleTransactions.entries();
			for (let i = 0; i < possibleTransactions.size; i++) {
				const possibleTx = possibleTransactionsIterator.next().value;
				currentAccountTotal = currentAccountTotal
					.minus(
						possibleTx[1].vout.reduce((accumulation, vout) => {
							if (!changeAddressesMap.get(vout.scriptpubkey_address)) {
								return accumulation.plus(vout.value);
							}
							return accumulation;
						}, BigNumber(0)),
					)
					.minus(possibleTx[1].fee);
				transactions.set(possibleTx[0], possibleTx[1]);
			}
		}
	}

	const transactionsIterator = transactions.values();
	const transactionsArray = [];
	for (let i = 0; i < transactions.size; i++) {
		transactionsArray.push(transactionsIterator.next().value);
	}

	transactionsArray.sort((a, b) => b.status.block_time - a.status.block_time);
	return transactionsArray;
};

const getDataFromXPub = async (account, currentBitcoinNetwork) => {
	try {
		const { changeAddresses, receiveAddresses, transactions, unusedChangeAddresses, unusedReceiveAddresses } = await scanForAddressesAndTransactions(
			account,
			currentBitcoinNetwork,
			10,
		);

		const availableUtxos = await getUtxosAddressesFromBlockstream(receiveAddresses.concat(changeAddresses), currentBitcoinNetwork);
		const organizedTransactions = arrangeTransactions(transactions, receiveAddresses, changeAddresses);

		return [receiveAddresses, availableUtxos, changeAddresses, organizedTransactions, unusedReceiveAddresses, unusedChangeAddresses];
	} catch (error) {
		return Promise.reject(new Error(error));
	}
};

// https://github.com/jlopp/xpub-converter/blob/master/js/xpubConvert.js
const zpubToXpub = (zpub, testnet) => {
	const zpubDecoded = bs58check.decode(zpub);
	const zpubRemovedPrefix = zpubDecoded.slice(4);
	const xpubBuffer = Buffer.concat([Buffer.from(testnet ? '043587cf' : '0488b21e', 'hex'), zpubRemovedPrefix]);
	const xpub = bs58check.encode(xpubBuffer);
	return xpub;
};

module.exports = {
	areBitcoinNetworkEqual,
	getBitcoinNetworkType,
	getDataFromXPub,
	getP2shDerivationPathForNetwork,
	getMultisigDerivationPathForNetwork,
	zpubToXpub,
};

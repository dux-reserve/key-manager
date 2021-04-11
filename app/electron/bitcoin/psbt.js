const { address, Psbt } = require('bitcoinjs-lib');
const { multisigWitnessScript } = require('unchained-bitcoin');

const getTransactionHex = async (txid, currentBitcoinNetwork, currentNetwork) => {
	const { getTransactionHexFromBlockstream } = require('./network');

	if (currentNetwork === 'blockstream') {
		return await getTransactionHexFromBlockstream(txid, currentBitcoinNetwork);
	}
};

const getNextChangeAddress = unusedChangeAddresses => {
	return unusedChangeAddresses[0].address;
};

const createPsbt = async (txInputs, txOutputs, unusedChangeAddresses, config, currentBitcoinNetwork, isRBF = true, currentNetwork = 'blockstream') => {
	const psbt = new Psbt({ network: currentBitcoinNetwork });
	psbt.setVersion(2);
	psbt.setLocktime(0);

	for (let i = 0; i < txInputs.length; i++) {
		const input = txInputs[i];
		const prevTxHex = await getTransactionHex(input.txid, currentBitcoinNetwork, currentNetwork);
		const currentInput = {
			hash: input.txid,
			index: input.vout,
			sequence: isRBF ? 0xfffffffd : 0xffffffff,
			nonWitnessUtxo: Buffer.from(prevTxHex, 'hex'),
			bip32Derivation: input.address.bip32derivation.map(derivation => ({
				masterFingerprint: Buffer.from(Object.values(derivation.masterFingerprint)),
				pubkey: Buffer.from(Object.values(derivation.pubkey)),
				path: derivation.path,
			})),
		};

		if (config.addressType === 'P2WSH') {
			// P2WSH requires witnessScript
			currentInput.witnessScript = Buffer.from(Object.values(multisigWitnessScript(input.address).output));
		} else {
			currentInput.redeemScript = Buffer.from(Object.values(input.address.redeem.output));
		}

		psbt.addInput(currentInput);
	}

	for (let i = 0; i < txOutputs.length; i++) {
		const output = txOutputs[i];

		const outputAddress = output.address ? output.address : getNextChangeAddress(unusedChangeAddresses);

		const currentOutput = {
			script: address.toOutputScript(outputAddress, currentBitcoinNetwork),
			value: output.value,
		};

		psbt.addOutput(currentOutput);
	}

	return psbt.toBase64();
};

const combinePsbts = (createdPsbt, signedPsbts) => {
	if (signedPsbts.length > 1) {
		const combinedPsbt = typeof createdPsbt === 'object' ? createdPsbt : Psbt.fromBase64(createdPsbt);
		const base64SignedPsbts = signedPsbts.map(psbt => {
			if (typeof psbt === 'object') {
				return psbt;
			} else {
				return Psbt.fromBase64(psbt);
			}
		});
		if (base64SignedPsbts.length) {
			// if there are multi signed psbts, combine them
			combinedPsbt.combine(...base64SignedPsbts);
		}
		return combinedPsbt.toBase64();
	} else {
		return signedPsbts[0];
	}
};

const finalizeAllInputs = finalPsbt => {
	if (typeof finalPsbt === 'string') {
		const finalizedPsbt = Psbt.fromBase64(finalPsbt);
		return finalizedPsbt.finalizeAllInputs().toBase64();
	} else {
		return finalPsbt.finalizeAllInputs().toBase64();
	}
};

const getPsbtFromString = string => {
	try {
		return Psbt.fromBase64(string);
	} catch (error) {
		try {
			// Trying to get hex
			return Psbt.fromHex(string);
		} catch (error) {
			throw new Error('Invalid PSBT');
		}
	}
};

const getPsbtFromBase64 = psbt => {
	if (typeof psbt === 'string') {
		return Psbt.fromBase64(psbt);
	} else {
		return psbt;
	}
};

module.exports = {
	combinePsbts,
	createPsbt,
	finalizeAllInputs,
	getPsbtFromString,
	getPsbtFromBase64,
};

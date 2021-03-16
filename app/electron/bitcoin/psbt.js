const { address, Psbt } = require('bitcoinjs-lib');
const { multisigWitnessScript } = require('unchained-bitcoin');

// !! TODO: refactor
const getNextChangeAddress = unusedChangeAddresses => {
	return unusedChangeAddresses[0].address;
};

const createPsbt = async (txInputs, txOutputs, unusedChangeAddresses, config, currentBitcoinNetwork) => {
	const { getTransactionHex } = require('./network');
	const psbt = new Psbt({ network: currentBitcoinNetwork });
	psbt.setVersion(2);
	psbt.setLocktime(0);

	// sequence: 0xffffffff,
	for (let i = 0; i < txInputs.length; i++) {
		const input = txInputs[i];
		const prevTxHex = await getTransactionHex(input.txid, currentBitcoinNetwork);
		const currentInput = {
			hash: input.txid,
			index: input.vout,
			sequence: 0xfffffffd,
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

		const outputAddress = !output.address ? getNextChangeAddress(unusedChangeAddresses) : output.address;

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

const getPsbtFromText = text => {
	try {
		return Psbt.fromBase64(text);
	} catch (error) {
		try {
			// Trying to get hex
			return Psbt.fromHex(text);
		} catch (error) {
			throw new Error('Invalid PSBT');
		}
	}
};

const psbtFromBase64 = psbt => {
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
	getPsbtFromText,
	psbtFromBase64,
};

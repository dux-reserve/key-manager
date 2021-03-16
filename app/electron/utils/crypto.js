const CryptoJS = require('crypto-js');

const baseKey = process.env.BASE_KEY;

const encryptDataAES = (plainData, password) => {
	return CryptoJS.AES.encrypt(plainData, password).toString();
};

const decryptDataAES = (encryptedData, password) => {
	return CryptoJS.AES.decrypt(encryptedData, password);
};

const createEncryptedDuxConfig = configData => {
	try {
		const encryptedConfigData = {
			encrypted_config: CryptoJS.AES.encrypt(JSON.stringify(configData), baseKey).toString(),
			withCustomPassword: false,
		};

		return encryptedConfigData;
	} catch (error) {
		return new Error('Error encrypting config file');
	}
};

const decryptEncryptedDuxConfig = encryptedConfigData => {
	try {
		const decryptedData = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(encryptedConfigData, baseKey)));
		return decryptedData;
	} catch (error) {
		return new Error('Error decrypting config file');
	}
};

module.exports = {
	encryptDataAES,
	decryptDataAES,
	createEncryptedDuxConfig,
	decryptEncryptedDuxConfig,
};
